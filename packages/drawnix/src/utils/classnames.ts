type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassDictionary
  | ClassArray;

type ClassDictionary = Record<string, any>;
type ClassArray = ClassValue[];

function appendClass(value: ClassValue, classes: string[]) {
  if (!value && value !== 0) {
    return;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    classes.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(item => appendClass(item, classes));
    return;
  }

  if (typeof value === 'object') {
    for (const [key, active] of Object.entries(value as ClassDictionary)) {
      if (active) {
        classes.push(key);
      }
    }
  }
}

export function classNames(...values: ClassValue[]): string {
  const classes: string[] = [];
  values.forEach(value => appendClass(value, classes));
  return classes.join(' ');
}
