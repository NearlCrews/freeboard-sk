import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  Input,
  output,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import {
  FbFabComponent,
  FbTooltipDirective
} from 'src/app/design-system/primitives';

interface PiPVideoElement extends HTMLVideoElement {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requestPictureInPicture(): any;
}

//** Picture in Picture video component **
@Component({
  selector: 'pip-video',
  imports: [FbFabComponent, FbTooltipDirective],
  template: `
    <div
      style="border: var(--color-border) 1px solid;border-radius: var(--radius-md);display:none;"
    >
      <video #vid [src]="vidUrl" [muted]="muted" autoplay></video>
    </div>
    <div style="padding-left: var(--space-xs);">
      <fb-fab
        variant="secondary"
        icon="videocam"
        ariaLabel="Show Video"
        [style.display]="src ? 'block' : 'none'"
        fbTooltip="Show Video"
        fbTooltipPosition="left"
        [disabled]="pipMode"
        (pressed)="initPiP()"
      ></fb-fab>
    </div>
  `
})
export class PiPVideoComponent implements OnInit, OnChanges {
  private pipVideo!: PiPVideoElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pipWindow: any;
  pipMode = false;
  vidUrl = '';
  @Input() src = '';
  @Input() muted = true;
  readonly resize = output<[number, number]>();
  readonly change = output<boolean>();
  readonly click = output<boolean>();
  @ViewChild('vid', { static: true }) vid!: ElementRef;

  ngOnInit() {
    if (!('pictureInPictureEnabled' in document)) {
      this.pipMode = true; // disable button by mimicing pipMode
    }

    this.pipVideo = this.vid.nativeElement;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.pipVideo.addEventListener('enterpictureinpicture', (event: any) => {
      this.pipMode = true;
      this.pipWindow = event.pictureInPictureWindow;
      this.pipWindow.addEventListener(
        'resize',
        this.onPipWindowResize.bind(this)
      );
      this.change.emit(this.pipMode);
    });

    this.pipVideo.addEventListener('leavepictureinpicture', () => {
      this.pipMode = false;
      this.pipVideo.pause();
      this.pipWindow.removeEventListener('resize', this.onPipWindowResize);
      this.change.emit(this.pipMode);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['src'] && changes['src'].currentValue) {
      this.vidUrl = this.src;
    }
  }

  // ** pipWindow resize event handler **
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPipWindowResize(event: any) {
    this.resize.emit([event.srcElement.width, event.srcElement.height]);
  }

  toggleMute() {
    this.muted = !this.muted;
  }

  // ** initialise picture in picture mode
  async initPiP() {
    try {
      await this.pipVideo.requestPictureInPicture();
      this.pipMode = true;
      this.vid.nativeElement.play();
      this.click.emit(true);
    } catch (e) {
      this.pipMode = false;
    }
  }
}
