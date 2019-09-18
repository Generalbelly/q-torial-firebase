import Entity from './Entity'

export default class GaEntity extends Entity {
  email:string|null = null;

  refreshToken:string|null = null;

  accountId:string|null = null;

  accountName:string|null = null;

  propertyId:string|null = null;

  propertyName:string|null = null;

  viewId:string|null = null;

  viewName:string|null = null;

  constructor(init?: Partial<GaEntity>) {
    super()
    Object.assign(this, init);
  }
}
