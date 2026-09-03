import { Component, EventEmitter, Input, Output } from '@angular/core';
export type ToastType = 'success' | 'error' | 'info';
@Component({ selector: 'app-toast', templateUrl: './toast.html', styleUrl: './toast.scss' })
export class ToastComponent { @Input() open = false; @Input() type: ToastType = 'success'; @Input() title = ''; @Input() message = ''; @Output() readonly dismiss = new EventEmitter<void>(); }
