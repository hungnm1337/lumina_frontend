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