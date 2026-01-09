import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RiskList } from './risk-list';

describe('RiskList', () => {
  let component: RiskList;
  let fixture: ComponentFixture<RiskList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RiskList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
