import { isUser } from '../middleware/auth.middleware';
import * as roomController from '../controllers/rooms.controller';
import { asyncErrorHandler } from '../middleware/error.middleware';
import { Router } from "express";

import { validate } from '../middleware/validation.middleware';
import * as roomSchema from '../schemas/room.schema';


export const roomsRouter = Router();


roomsRouter.get("/me", isUser, asyncErrorHandler(roomController.getUserRooms));
roomsRouter.get("/:roomId", isUser, asyncErrorHandler(roomController.getRoomById));
roomsRouter.get("/:roomId/members", isUser, asyncErrorHandler(roomController.getRoomMembers));


roomsRouter.post(
  "/",
  isUser,
  validate(roomSchema.createRoomBodySchema),
  asyncErrorHandler(roomController.createRoom)
);
roomsRouter.post(
  "/direct",
  isUser,
  validate(roomSchema.createDirectMessageRoomBodySchema),
  asyncErrorHandler(roomController.createDirectMessageRoom)
);


roomsRouter.post("/:roomId/join", isUser, asyncErrorHandler(roomController.joinRoom));
roomsRouter.post("/:roomId/leave", isUser, asyncErrorHandler(roomController.leaveRoom));


roomsRouter.post(
  "/:roomId/transfer-ownership",
  isUser,
  validate(roomSchema.transferOwnershipBodySchema),
  asyncErrorHandler(roomController.transferOwnership)
);
roomsRouter.post(
  "/:roomId/promote",
  isUser,
  validate(roomSchema.promoteMemberBodySchema),
  asyncErrorHandler(roomController.promoteMember)
);
roomsRouter.post(
  "/:roomId/demote",
  isUser,
  validate(roomSchema.demoteMemberBodySchema),
  asyncErrorHandler(roomController.demoteMember)
);
roomsRouter.post(
  "/:roomId/kick",
  isUser,
  validate(roomSchema.kickMemberBodySchema),
  asyncErrorHandler(roomController.kickMember)
);