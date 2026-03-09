import { Pipe, PipeTransform } from '@angular/core';
// TODO : utiliser TitleCasePipe natif Angular (ou garder ce pipe)

@Pipe({ name: 'capitalize', standalone: true })
export class CapitalizePipe implements PipeTransform {
  transform(value: any, ...args: any[]): any {
    // TODO : implémenter la transformation
    return value;
  }
}
