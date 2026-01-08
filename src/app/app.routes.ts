import { Routes } from '@angular/router';
import { TableSearchComponent } from './pages/table-search/table-search';

export const routes: Routes = [
  { path: '', redirectTo: 'table-search', pathMatch: 'full' },
  { path: 'table-search', component: TableSearchComponent }
];
