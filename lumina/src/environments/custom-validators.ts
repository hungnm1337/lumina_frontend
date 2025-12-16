import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator để kiểm tra một trường không được chỉ chứa khoảng trắng.
 * @returns ValidatorFn
 */
export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    // Kiểm tra nếu control có giá trị và giá trị đó sau khi cắt bỏ khoảng trắng ở 2 đầu có rỗng không
    const isWhitespace = (control.value || '').trim().length === 0;
    
    // Nếu chỉ là khoảng trắng thì trả về lỗi, ngược lại thì hợp lệ (trả về null)
    return isWhitespace ? { 'whitespace': true } : null;
  };
}

/**
 * Validator để kiểm tra nội dung có ý nghĩa (không chỉ là ký tự đặc biệt lặp lại).
 * Yêu cầu: phải có ít nhất một ký tự chữ hoặc số
 * @returns ValidatorFn
 */
export function meaningfulContentValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value || '').trim();
    
    // Nếu rỗng, để validator required xử lý
    if (!value) {
      return null;
    }
    
    // Kiểm tra xem có ít nhất một ký tự chữ hoặc số không
    const hasAlphanumeric = /[a-zA-Z0-9\u00C0-\u1EF9]/.test(value);
    
    if (!hasAlphanumeric) {
      return { 'meaninglessContent': true };
    }
    
    // Kiểm tra xem có phải toàn ký tự lặp lại không (ví dụ: ".....", "!!!!!")
    const valueWithoutSpaces = value.replaceAll(/\s/g, '');
    const uniqueChars = new Set(valueWithoutSpaces).size;
    if (uniqueChars === 1 && valueWithoutSpaces.length > 3) {
      return { 'repeatedCharacters': true };
    }
    
    return null;
  };
}