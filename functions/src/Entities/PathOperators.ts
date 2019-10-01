export const PATH_ALL: string = 'ALL'
export const PATH_EQUALS: string = 'EQUALS'
export const PATH_STARTS_WITH: string = 'STARTS_WITH'
// export const PATH_ENDS_WITH = 'ENDS_WITH'
// export const PATH_CONTAINS = 'CONTAINS'
// export const PATH_NOT_EQUALS = 'NOT_EQUALS'
export const PATH_REGEX: string = 'REGEX'

export default [
  {
    value: PATH_ALL,
    text: 'All the url path',
    pathPriority: 0,
  },
  {
    value: PATH_EQUALS,
    text: 'url paths that equal to',
    pathPriority: 1,
  },
  {
    value: PATH_STARTS_WITH,
    text: 'url paths that start with',
    pathPriority: 3,
  },
  // {
  //   value: PATH_ENDS_WITH,
  //   text: 'Url paths that ends with',
  // },
  // {
  //   value: PATH_CONTAINS,
  //   text: 'Url paths that contains',
  // },
  {
    value: PATH_REGEX,
    text: 'url paths that match the following regular expression: ',
    pathPriority: 2,
  },
  // {
  //   value: PATH_NOT_EQUALS,
  //   text: 'Path names that are not equal to',
  // },
]

export const validateUrlPath = (pathOperator: string, pathValue: string, urlPath: string) => {
  const evaluators = {
    [PATH_EQUALS]: (pv: string, up: string) => pv === up,
    [PATH_STARTS_WITH]: (pv: string, up: string) => up.startsWith(pv),
    // [PATH_ENDS_WITH]: (pv, up) => up.endsWith(pv),
    // [PATH_CONTAINS]: (pv, up) => up.includes(pv),
    [PATH_REGEX]: (pv: string, up: string) => new RegExp(pv).test(up),
    // [PATH_NOT_EQUALS]: (pv, up) => pv !== up,
    [PATH_ALL]: (pv: string, up: string) => true,
  }
  const valid = evaluators[pathOperator](pathValue, urlPath)
  console.log('pathOperator', pathOperator);
  console.log('pathValue', pathValue);
  console.log('urlPath', urlPath);
  console.log('valid', valid);
  return valid
}