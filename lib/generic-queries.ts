import { notifDbInAppNotificationsTableName } from './constants'

export const selectNotifDbInAppNotifications = `
Select
  id,
  type,
  receiver_username As receiverUsername,
  body,
  is_read As isRead,
  created_time As createdTime,
  last_updated_time As lastUpdatedTime,
  From ${notifDbInAppNotificationsTableName}
`
