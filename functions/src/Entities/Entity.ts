import admin from '../admin'
export default class Entity {
  id:string|null = null

  createdAt: admin.firestore.FieldValue|null = null

  updatedAt: admin.firestore.FieldValue|null = null

  toPlainObject(privateProperty: string[] = ['id']) {
    const object: any = {};
    const has = Object.prototype.hasOwnProperty;
    const self: any = this;
    Object.keys(this).forEach((propertyName) => {
      if (
        !privateProperty.includes(propertyName)
        && has.call(this, propertyName)
      ) {
        object[propertyName] = self[propertyName];
      }
    });
    return object;
  }

}
