import { notifDbInAppNotificationsTableName, portfDbKitCategoriesTableName } from './constants'

export const selectNotifDbInAppNotifications = `
Select
  id,
  type,
  receiver_username As receiverUsername,
  body,
  is_read As isRead,
  DATE_FORMAT(created_time, '%Y-%m-%dT%H:%i:%sZ') As createdTime,
  DATE_FORMAT(last_updated_time, '%Y-%m-%dT%H:%i:%sZ') As lastUpdatedTime
  From ${notifDbInAppNotificationsTableName}
`
export const selectPortfDbKitCategories = `
Select
  id,
  name,
  image_url As imageUrl
  From ${portfDbKitCategoriesTableName}
`
