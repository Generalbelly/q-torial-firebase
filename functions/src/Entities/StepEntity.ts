import Entity from './Entity'
import { validateUrlPath } from './PathOperators'

export default class StepEntity extends Entity {
  type: string = 'tooltip' // tooltip, modal

  trigger: Object = {
    target: 'window', // window #id, .class
    event: 'load', // load, click, focus, error, null
    waitingTime: 0,
  }

  highlightTarget: string|null = null // #id, .class, modal

  config: Object = {}

  order: number = 0

  pathOperator = 'EQUALS' // ALL, EQUALS, STARTS_WITH, ENDS_WITH, CONTAINS, REGEX, NOT_EQUALS

  pathValue: string|null = null

  parameters: Array<Object> = []

  constructor(init?: Partial<StepEntity>) {
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
