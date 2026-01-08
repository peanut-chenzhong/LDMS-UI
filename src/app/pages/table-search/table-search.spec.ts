import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableSearch } from './table-search';

describe('TableSearch', () => {
  let component: TableSearch;
  let fixture: ComponentFixture<TableSearch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableSearch]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableSearch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
