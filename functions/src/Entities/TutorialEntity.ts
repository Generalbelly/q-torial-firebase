import Entity from './Entity'
import StepEntity from './StepEntity'
import { validateUrlPath } from './PathOperators'

export default class TutorialEntity extends Entity {
  name: string|null = null

  description: string|null = null

  domain: string|null = null

  pathOperator = 'EQUALS'

  pathValue: string|null = null

  parameters: Array<Object> = []

  settings: Object = {}

  buildUrl: string|null = null

  isActive: boolean = false

  steps: Array<StepEntity> = []

  constructor(init?: Partial<TutorialEntity>) {
    super()
    Object.assign(this, init);
  }

  couldBeShownOn(urlPath: string) {
    if (this.pathValue) {
      return validateUrlPath(this.pathOperator, this.pathValue, urlPath)
    }
    return false;
  }
}
