# app.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import io
import requests

# --- Image captioning dependencies ---
from PIL import Image, UnidentifiedImageError
from transformers import ViTImageProcessor, AutoTokenizer, VisionEncoderDecoderModel
import torch

# --- NLP scoring dependencies ---
import language_tool_python
from sentence_transformers import SentenceTransformer, util

# -----------------------------------------------------------------------------
# Khởi tạo FastAPI + CORS
# -----------------------------------------------------------------------------
app = FastAPI()

origins = [
    "http://localhost:4200",
    "http://localhost:7162",
    "http://localhost",
    "http://127.0.0.1",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Tải model cho IMAGE CAPTIONING (giữ nguyên logic từ api.py)
# -----------------------------------------------------------------------------
model_name = "nlpconnect/vit-gpt2-image-captioning"

try:
    feature_extractor = ViTImageProcessor.from_pretrained(model_name)
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    vision2text_model = VisionEncoderDecoderModel.from_pretrained(model_name)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    vision2text_model.to(device)

    # Thiết lập tham số decoder giống bản gốc
    vision2text_model.config.decoder_start_token_id = getattr(tokenizer, "bos_token_id", None) or tokenizer.cls_token_id
    vision2text_model.config.eos_token_id = tokenizer.eos_token_id
    vision2text_model.config.pad_token_id = tokenizer.pad_token_id
    vision2text_model.config.vocab_size = vision2text_model.config.decoder.vocab_size

    print(f"[Caption] Loaded {model_name} on {device}")
except Exception as e:
    # Nếu không tải được model thì raise lỗi ngay khi khởi động
    raise RuntimeError(f"Failed to load caption model '{model_name}': {e}")

def generate_caption(image_input: Image.Image) -> str:
    """
    Sinh caption cho ảnh. Giữ nguyên tham số sinh từ api.py.
    """
    pixel_values = feature_extractor(images=image_input, return_tensors="pt").pixel_values.to(device)
    gen_kwargs = {"max_length": 16, "num_beams": 4}
    output_ids = vision2text_model.generate(pixel_values, **gen_kwargs)
    preds = tokenizer.batch_decode(output_ids, skip_special_tokens=True)
    return preds[0].strip()

# -----------------------------------------------------------------------------
# Tải công cụ cho NLP SCORING (giữ nguyên logic từ main.py)
# -----------------------------------------------------------------------------
grammar_tool = language_tool_python.LanguageTool('en-US')
semantic_model = SentenceTransformer('all-MiniLM-L6-v2')

# -----------------------------------------------------------------------------
# Pydantic models
# -----------------------------------------------------------------------------
class ScoreRequest(BaseModel):
    transcript: str
    sample_answer: str

class ScoreResponse(BaseModel):
    grammar_score: float
    content_score: float
    vocabulary_score: float

class CaptionRequest(BaseModel):
    imageUrl: str

class CaptionResponse(BaseModel):
    caption: str

# -----------------------------------------------------------------------------
# Endpoint: NLP Scoring (giữ nguyên thuật toán từ main.py)
# -----------------------------------------------------------------------------
@app.post("/score_nlp", response_model=ScoreResponse)
def score_natural_language_processing(request: ScoreRequest):
    transcript_text = request.transcript.strip() if request.transcript else ""
    sample_answer_text = request.sample_answer

    if not transcript_text:
        return ScoreResponse(grammar_score=0.0, content_score=0.0, vocabulary_score=0.0)

    words = transcript_text.split()
    word_count = len(words)

    # 1) Grammar score (chuẩn IIG như bản gốc)
    matches = grammar_tool.check(transcript_text)
    number_of_errors = len(matches)

    if word_count > 0:
        error_rate = (number_of_errors / word_count) * 100
        if error_rate < 2:
            grammar_score = 95 + (2 - error_rate) * 2.5
        elif error_rate < 5:
            grammar_score = 80 + (5 - error_rate) * 5
        elif error_rate < 10:
            grammar_score = 60 + (10 - error_rate) * 4
        elif error_rate < 20:
            grammar_score = 30 + (20 - error_rate) * 3
        else:
            grammar_score = max(0, 30 - (error_rate - 20) * 1.5)
        grammar_score = round(max(0, min(100, grammar_score)), 2)
    else:
        grammar_score = 0.0

    # 2) Content score (cosine similarity)
    emb1 = semantic_model.encode(transcript_text, convert_to_tensor=True)
    emb2 = semantic_model.encode(sample_answer_text, convert_to_tensor=True)
    cosine_similarity = util.cos_sim(emb1, emb2)
    content_score = round(float(cosine_similarity.item()) * 100, 2)

    # 3) Vocabulary score (giữ nguyên các thang điểm)
    if not words:
        vocabulary_score = 0.0
    else:
        avg_len = sum(len(w) for w in words) / len(words)

        # 3.1 Word Length (20%)
        if avg_len >= 5.5:
            length_score = 95 + (avg_len - 5.5) * 10
        elif avg_len >= 4.5:
            length_score = 70 + (avg_len - 4.5) * 25
        elif avg_len >= 3.5:
            length_score = 40 + (avg_len - 3.5) * 30
        else:
            length_score = avg_len * 10
        length_score = min(100, max(0, length_score))

        # 3.2 Lexical Diversity (30%)
        unique_words = set(w.lower() for w in words)
        diversity_ratio = len(unique_words) / len(words) if words else 0
        if diversity_ratio >= 0.7:
            diversity_score = 90 + (diversity_ratio - 0.7) * 33
        elif diversity_ratio >= 0.5:
            diversity_score = 70 + (diversity_ratio - 0.5) * 100
        elif diversity_ratio >= 0.3:
            diversity_score = 40 + (diversity_ratio - 0.3) * 150
        else:
            diversity_score = diversity_ratio * 133
        diversity_score = min(100, max(0, diversity_score))

        # 3.3 Advanced Words (30%) - >7 chars
        adv_ratio = len([w for w in words if len(w) > 7]) / len(words)
        if adv_ratio >= 0.2:
            advanced_score = 90 + (adv_ratio - 0.2) * 50
        elif adv_ratio >= 0.1:
            advanced_score = 70 + (adv_ratio - 0.1) * 200
        elif adv_ratio >= 0.05:
            advanced_score = 40 + (adv_ratio - 0.05) * 600
        else:
            advanced_score = adv_ratio * 800
        advanced_score = min(100, max(0, advanced_score))

        # 3.4 Sophisticated Words (20%) - >8 chars
        soph_ratio = len([w for w in words if len(w) > 8]) / len(words)
        if soph_ratio >= 0.15:
            sophisticated_score = 90 + (soph_ratio - 0.15) * 66
        elif soph_ratio >= 0.08:
            sophisticated_score = 70 + (soph_ratio - 0.08) * 285
        elif soph_ratio >= 0.03:
            sophisticated_score = 40 + (soph_ratio - 0.03) * 600
        else:
            sophisticated_score = soph_ratio * 1333
        sophisticated_score = min(100, max(0, sophisticated_score))

        vocabulary_score = (
            length_score * 0.20 +
            diversity_score * 0.30 +
            advanced_score * 0.30 +
            sophisticated_score * 0.20
        )

    return ScoreResponse(
        grammar_score=grammar_score,
        content_score=content_score,
        vocabulary_score=round(vocabulary_score, 2)
    )

# -----------------------------------------------------------------------------
# Endpoint: Image Caption (giữ nguyên hành vi từ api.py)
# -----------------------------------------------------------------------------
@app.post("/caption", response_model=CaptionResponse)
def get_image_caption(body: CaptionRequest):
    image_url = body.imageUrl
    if not image_url:
        raise HTTPException(status_code=400, detail="imageUrl is required")

    try:
        resp = requests.get(image_url, stream=True, timeout=20)
        resp.raise_for_status()

        image = Image.open(io.BytesIO(resp.content)).convert("RGB")
        caption_text = generate_caption(image)
        return CaptionResponse(caption=caption_text)

    except requests.exceptions.RequestException as e:
        # Phản hồi giống api.py: 500 khi tải ảnh lỗi
        raise HTTPException(status_code=500, detail=f"Failed to download image from URL: {e}")
    except UnidentifiedImageError:
        # Phản hồi 400 khi URL không phải ảnh hợp lệ
        raise HTTPException(status_code=400, detail="The provided URL does not point to a valid image.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")
