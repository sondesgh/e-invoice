import { Pipe, PipeTransform } from '@angular/core';
// TODO ADAPTER depuis : components/util/truncate-characters.filter.js

@Pipe({ name: 'truncate', standalone: true })
export class TruncatePipe implements PipeTransform {
  transform(value: any, ...args: any[]): any {
    // TODO : implémenter la transformation
    return value;
  }
}
