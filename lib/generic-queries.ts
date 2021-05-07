import { notifDbInAppNotificationsTableName } from './constants'

export const selectNotifDbInAppNotifications = `
Select
  id,
  type,
  receiver_username As receiverUsername,
  body,
  is_read As isRead,
  DATE_FORMAT(created_time, '%Y-%m-%dT%H:%i:%s0Z') As createdTime,
  DATE_FORMAT(last_updated_time, '%Y-%m-%dT%H:%i:%s0Z') As lastUpdatedTime
  From ${notifDbInAppNotificationsTableName}
`
