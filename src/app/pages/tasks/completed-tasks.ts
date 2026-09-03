import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state';
@Component({ selector: 'app-completed-tasks', imports: [EmptyStateComponent, RouterLink], templateUrl: './completed-tasks.html', styleUrl: './completed-tasks.scss' })
export class CompletedTasks {}
