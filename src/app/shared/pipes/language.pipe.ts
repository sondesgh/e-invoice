import { Pipe, PipeTransform } from '@angular/core';
// TODO ADAPTER depuis : components/language/language.filter.js

@Pipe({ name: 'language', standalone: true })
export class LanguagePipe implements PipeTransform {
  transform(value: any, ...args: any[]): any {
    // TODO : implémenter la transformation
    return value;
  }
}
