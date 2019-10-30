import admin from '../admin'
import Entity from './Entity'

export default class StripeCustomerEntity extends Entity {
  id: string|null = null
  customerId: string = ""
  subscriptionId: string = ""
  deletedAt: admin.firestore.FieldValue|null = null

  constructor(init?: Partial<StripeCustomerEntity>) {
    super()
    Object.assign(this, init);
  }
}