export const pick = <T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => keys.reduce(
  (acc, key) => { obj[key] !== undefined ? acc[key] = obj[key] : 'ignore'; return acc; }, {} as Pick<T, K>
)
