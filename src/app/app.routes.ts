import { Routes } from '@angular/router';
import { TableSearchComponent } from './pages/table-search/table-search';
import { TaskListComponent } from './pages/task-list/task-list';
import { RiskListComponent } from './pages/risk-list/risk-list';

export const routes: Routes = [
  { path: '', redirectTo: 'table-search', pathMatch: 'full' },
  { path: 'table-search', component: TableSearchComponent },
  { path: 'task-list', component: TaskListComponent },
  { path: 'risk-list', component: RiskListComponent }
];
