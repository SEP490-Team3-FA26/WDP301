import { Controller, Get, Patch, Delete, Query, Param, Req, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lấy notifications cho user hiện tại' })
  async getMyNotifications(
    @Query('unreadOnly') unreadOnly: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Req() req: any,
  ) {
    const user = req.user;
    const notifications = await this.notificationService.findForUser(
      user._id,
      user.role,
      user.branchId,
      {
        unreadOnly: unreadOnly === 'true',
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    );

    // Transform: add `read` boolean field per user
    const result = notifications.map((n: any) => ({
      ...n,
      read: (n.readBy || []).includes(user._id),
    }));

    return { success: true, data: result };
  }

  @Get('new')
  @ApiOperation({ summary: 'Polling: lấy notifications mới sau timestamp' })
  async getNewNotifications(@Query('after') after: string, @Req() req: any) {
    const user = req.user;
    const afterDate = new Date(after || 0);

    const notifications = await this.notificationService.findNewSince(
      user._id,
      user.role,
      user.branchId,
      afterDate,
    );

    const result = notifications.map((n: any) => ({
      ...n,
      read: (n.readBy || []).includes(user._id),
    }));

    return { success: true, data: result };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Đếm notifications chưa đọc' })
  async getUnreadCount(@Req() req: any) {
    const user = req.user;
    const count = await this.notificationService.getUnreadCount(user._id, user.role, user.branchId);
    return { success: true, data: count };
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Đánh dấu tất cả đã đọc' })
  async markAllAsRead(@Req() req: any) {
    const user = req.user;
    await this.notificationService.markAllAsRead(user._id, user.role, user.branchId);
    return { success: true, message: 'All notifications marked as read' };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu notification đã đọc' })
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const notification = await this.notificationService.markAsRead(id, user._id);
    return { success: true, data: notification };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá notification' })
  async deleteNotification(@Param('id') id: string) {
    await this.notificationService.delete(id);
    return { success: true, message: 'Notification deleted' };
  }
}
