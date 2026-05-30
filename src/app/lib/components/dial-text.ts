import {
  ChangeDetectionStrategy,
  Component,
  Input,
  SimpleChanges,
  OnChanges
} from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ap-dial-text',
  imports: [],
  template: `
    <div class="dial-text fb-app-background">
      <div class="dial-text-title">
        {{ title }}&nbsp;
        @if (subTitle) {
          <span class="dial-text-subtitle">({{ subTitle }})</span>
        }
      </div>
      <div class="dial-text-value">{{ value }}</div>
      <div class="dial-text-units">{{ units }}</div>
    </div>
  `,
  styleUrls: ['./dial-text.css']
})
export class TextDialComponent {
  @Input() title = '';
  @Input() subTitle = '';
  @Input() value = '';
  @Input() units = '';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ap-dial-ttg',
  imports: [],
  template: `
    <div class="dial-text fb-app-background">
      <div class="dial-text-title">
        TTG&nbsp;
        @if (subTitle) {
          <span class="dial-text-subtitle"> ({{ subTitle }}) </span>
        }
      </div>
      <div class="dial-text-value">{{ ttg }}</div>
      <div class="dial-text-units">{{ units }}</div>
    </div>
  `,
  styleUrls: ['./dial-text.css']
})
export class TTGDialComponent implements OnChanges {
  @Input() value: number | undefined;
  @Input() subTitle = '';
  protected ttg = '--';
  protected units = 'min';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value']) {
      const cv = changes['value'].currentValue as unknown;
      if (typeof cv !== 'number') {
        this.ttg = '--';
        this.units = 'min';
      } else if (cv < 60) {
        this.ttg = Math.floor(cv).toString();
        this.units = 'min';
      } else if (cv < 60 * 24) {
        this.ttg = `${Math.floor(cv / 60)}:${(
          '00' + (cv % 60).toFixed(0)
        ).slice(-2)}`;
        this.units = 'hr:min';
      } else {
        const minPerDay = 60 * 24;
        const days = Math.floor(cv / minPerDay);
        const dm = days * minPerDay;
        const rhm = cv - dm;
        const hours = Math.floor(rhm / 60);
        const minutes = `00${Math.floor(rhm - hours * 60)}`.slice(-2);
        this.ttg = `${days}:${('00' + hours).slice(-2)}:${minutes}`;
        this.units = 'day:hr:min';
      }
    }
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ap-dial-eta',
  imports: [],
  template: `
    <div class="dial-text fb-app-background">
      <div class="dial-text-title">
        ETA&nbsp;
        @if (subTitle) {
          <span class="dial-text-subtitle"> ({{ subTitle }}) </span>
        }
      </div>
      <div class="dial-text-value">{{ etaTime }}</div>
      <div class="dial-text-units">{{ etaDate }}</div>
    </div>
  `,
  styleUrls: ['./dial-text.css']
})
export class ETADialComponent implements OnChanges {
  @Input() subTitle = '';
  @Input() value: Date | undefined;
  protected etaTime = '--';
  protected etaDate = '--';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value']) {
      const cv = changes['value'].currentValue as Date | undefined;
      if (cv instanceof Date) {
        this.etaTime = cv.toLocaleTimeString().split(':').slice(0, 2).join(':');
        this.etaDate = cv.toLocaleDateString();
      }
    }
  }
}
