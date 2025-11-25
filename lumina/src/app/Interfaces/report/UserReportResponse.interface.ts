export interface UserReportResponse {
  reportId: number;
  title: string;
  content: string;
  sendBy: string;
  sendAt: Date;
  replyBy?: string;
  replyAt?: Date;
  replyContent?: string;
  type: string;
}
