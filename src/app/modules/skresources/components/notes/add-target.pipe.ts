import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'addTarget',
  standalone: true
})
export class AddTargetPipe implements PipeTransform {
  public transform(value: string, target: string): string {
    if (typeof value === 'string') {
      const a = value.split('<a ');
      return a.join(`<a target="${target}" `);
    } else {
      return value;
    }
  }
}
