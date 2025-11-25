export interface UserReportRequest {
  reportId?: number;
  title: string;
  content: string;
  sendBy: number;
  sendAt: Date;
  replyBy?: number;
  replyAt?: Date;
  replyContent?: string;
  type: string;
}
