import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true, path: '/socket.io' })
export class ChatGateway {
  @WebSocketServer() server!: Server;
  @SubscribeMessage('trip-message')
  handleMessage(@MessageBody() body: { tripId: number; sender: string; content: string; type: string }) {
    this.server.to(`trip-${body.tripId}`).emit('trip-message', { ...body, sentAt: new Date().toISOString() });
  }
  @SubscribeMessage('join-trip')
  join(@MessageBody() body: { tripId: number }) {
    return { room: `trip-${body.tripId}` };
  }
}
