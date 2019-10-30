import admin from '../admin'
export default class Entity {
  id:string|null = null

  createdAt: admin.firestore.FieldValue|null = null

  updatedAt: admin.firestore.FieldValue|null = null

}
