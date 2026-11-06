import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

/** Focuses the element when it appears (the native `autofocus` attribute only works on page load). */
@Directive({ selector: '[sfAutofocus]' })
export class AutofocusDirective implements AfterViewInit {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  ngAfterViewInit(): void {
    this.el.nativeElement.focus();
  }
}
