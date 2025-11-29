export interface SlideDTO {
slideId?: number;
slideUrl: string;
slideName: string;
updateBy?: number;
createBy: number;
createdByName?: string; // Tên người tạo
isActive?: boolean;
updateAt?: Date;
createAt: Date;
}
