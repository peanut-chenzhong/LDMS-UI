import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface RiskItem {
  id: string;
  database: string;
  tablename: string;
  riskType: string;
  reason: string;
}

@Component({
  selector: 'app-risk-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './risk-list.html',
  styleUrl: './risk-list.scss'
})
export class RiskListComponent implements OnInit {
  // 数据
  allRisks: RiskItem[] = [];
  filteredRisks: RiskItem[] = [];

  // 分页
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [10, 20, 30, 50, 100];

  // 搜索
  searchDatabase = '';
  searchTableName = '';
  searchRiskType = '';

  // 下拉选项
  allDatabases: string[] = [];
  allTableNames: string[] = [];
  allRiskTypes: string[] = [];
  filteredDatabases: string[] = [];
  filteredTableNames: string[] = [];

  // 下拉框显示状态
  showDatabaseDropdown = false;
  showTableNameDropdown = false;

  // 风险类型选项
  riskTypeOptions = [
    { value: '', label: '全部类型' },
    { value: 'metadata_bloat', label: '元数据膨胀' },
    { value: 'schema_bloat', label: 'schema膨胀' },
    { value: 'compaction_backlog', label: 'compaction挤压' },
    { value: 'data_skew', label: '数据倾斜' },
    { value: 'log_oversized', label: 'log文件过大' },
    { value: 'compaction_failed', label: 'compaction失败' },
    { value: 'clean_failed', label: 'clean失败' },
    { value: 'archive_failed', label: 'archive失败' }
  ];

  get totalPages(): number {
    return Math.ceil(this.filteredRisks.length / this.pageSize) || 1;
  }

  get paginatedRisks(): RiskItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRisks.slice(start, start + this.pageSize);
  }

  get visiblePages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current > 3) {
        pages.push('...');
      }
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }
      if (current < total - 2) {
        pages.push('...');
      }
      pages.push(total);
    }
    return pages;
  }

  ngOnInit(): void {
    this.generateMockData();
    this.filteredRisks = [...this.allRisks];
    this.extractSearchOptions();
  }

  generateMockData(): void {
    const databases = ['hive_prod', 'hive_test', 'spark_warehouse', 'data_lake', 'analytics_db'];
    const tableNames = ['user_info', 'order_detail', 'product_catalog', 'transaction_log', 'session_data', 'event_tracking', 'inventory', 'customer_profile'];
    
    const riskTypes = [
      { type: 'metadata_bloat', label: '元数据膨胀' },
      { type: 'schema_bloat', label: 'schema膨胀' },
      { type: 'compaction_backlog', label: 'compaction挤压' },
      { type: 'data_skew', label: '数据倾斜' },
      { type: 'log_oversized', label: 'log文件过大' },
      { type: 'compaction_failed', label: 'compaction失败' },
      { type: 'clean_failed', label: 'clean失败' },
      { type: 'archive_failed', label: 'archive失败' }
    ];

    const reasons: Record<string, string[]> = {
      'metadata_bloat': [
        '元数据文件数量：2,847个，超过建议阈值500个',
        'Timeline文件累积过多，当前数量：1,256个，建议清理历史commit',
        '元数据目录大小：3.5GB，影响表初始化性能，建议执行元数据清理'
      ],
      'schema_bloat': [
        '当前Schema版本数：47，超过建议阈值20',
        '历史Schema变更频繁，建议清理旧版本元数据',
        'Schema演进记录过多影响元数据查询性能，当前版本数：89'
      ],
      'compaction_backlog': [
        '存在15个未完成的compaction任务，已累积超过7天',
        '文件版本数过多，当前版本数：128，建议阈值：50',
        'Compaction调度滞后，待处理log文件数：234个，建议增加compaction频率'
      ],
      'data_skew': [
        '最大分区大小：50GB，最小分区：500MB，倾斜比：100:1',
        '热点分区 dt=2024-01-08 数据量是平均值的20倍',
        '数据分布不均导致查询性能下降，最大bucket：12GB，最小bucket：100MB'
      ],
      'log_oversized': [
        'Archive日志大小：15GB，超过建议阈值1GB',
        '单个log文件大小：2.3GB，超过建议阈值128MB',
        '日志文件数量过多，当前数量：567个，建议执行archive操作'
      ],
      'compaction_failed': [
        'Compaction任务失败，错误：OutOfMemoryError，建议增加executor内存',
        '最近3次compaction连续失败，失败原因：数据文件损坏',
        'Compaction执行超时，已运行：4小时，超过阈值：2小时'
      ],
      'clean_failed': [
        'Clean任务执行失败，错误：无法删除文件，权限不足',
        '清理任务失败，存在被引用的历史版本无法删除',
        'Clean操作异常中断，部分文件未能清理，建议手动检查'
      ],
      'archive_failed': [
        'Archive任务失败，目标存储空间不足',
        '归档执行超时，大文件传输失败，建议分批执行',
        'Archive操作失败，错误：网络连接中断，建议重试'
      ]
    };

    for (let i = 1; i <= 156; i++) {
      const db = databases[Math.floor(Math.random() * databases.length)];
      const table = tableNames[Math.floor(Math.random() * tableNames.length)];
      const riskInfo = riskTypes[Math.floor(Math.random() * riskTypes.length)];
      const reasonList = reasons[riskInfo.type];
      const reason = reasonList[Math.floor(Math.random() * reasonList.length)];

      this.allRisks.push({
        id: `risk_${String(i).padStart(4, '0')}`,
        database: db,
        tablename: `${table}_${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
        riskType: riskInfo.label,
        reason
      });
    }
  }

  extractSearchOptions(): void {
    const databases = new Set<string>();
    const tableNames = new Set<string>();

    this.allRisks.forEach(risk => {
      databases.add(risk.database);
      tableNames.add(risk.tablename);
    });

    this.allDatabases = Array.from(databases).sort();
    this.allTableNames = Array.from(tableNames).sort();
    this.filteredDatabases = [...this.allDatabases];
    this.filteredTableNames = [...this.allTableNames];
  }

  filterRisks(): void {
    this.filteredRisks = this.allRisks.filter(risk => {
      const dbMatch = !this.searchDatabase || 
        risk.database.toLowerCase().includes(this.searchDatabase.toLowerCase());
      const tableMatch = !this.searchTableName || 
        risk.tablename.toLowerCase().includes(this.searchTableName.toLowerCase());
      const typeMatch = !this.searchRiskType || 
        risk.riskType === this.riskTypeOptions.find(o => o.value === this.searchRiskType)?.label;
      return dbMatch && tableMatch && typeMatch;
    });
    this.currentPage = 1;
  }

  onSearch(): void {
    this.filterRisks();
    this.showDatabaseDropdown = false;
    this.showTableNameDropdown = false;
  }

  onReset(): void {
    this.searchDatabase = '';
    this.searchTableName = '';
    this.searchRiskType = '';
    this.filteredDatabases = [...this.allDatabases];
    this.filteredTableNames = [...this.allTableNames];
    this.filteredRisks = [...this.allRisks];
    this.currentPage = 1;
  }

  // Database 下拉搜索
  onDatabaseInputChange(): void {
    const keyword = this.searchDatabase.toLowerCase().trim();
    if (keyword) {
      this.filteredDatabases = this.allDatabases.filter(db => 
        db.toLowerCase().includes(keyword)
      );
    } else {
      this.filteredDatabases = [...this.allDatabases];
    }
    this.showDatabaseDropdown = true;
  }

  onDatabaseFocus(): void {
    this.showDatabaseDropdown = true;
    this.showTableNameDropdown = false;
  }

  selectDatabase(db: string): void {
    this.searchDatabase = db;
    this.showDatabaseDropdown = false;
  }

  // TableName 下拉搜索
  onTableNameInputChange(): void {
    const keyword = this.searchTableName.toLowerCase().trim();
    if (keyword) {
      this.filteredTableNames = this.allTableNames.filter(table => 
        table.toLowerCase().includes(keyword)
      );
    } else {
      this.filteredTableNames = [...this.allTableNames];
    }
    this.showTableNameDropdown = true;
  }

  onTableNameFocus(): void {
    this.showTableNameDropdown = true;
    this.showDatabaseDropdown = false;
  }

  selectTableName(table: string): void {
    this.searchTableName = table;
    this.showTableNameDropdown = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-dropdown-container')) {
      this.showDatabaseDropdown = false;
      this.showTableNameDropdown = false;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  // 获取风险类型的样式类
  getRiskTypeClass(riskType: string): string {
    const classMap: Record<string, string> = {
      '元数据膨胀': 'risk-warning',
      'schema膨胀': 'risk-warning',
      'compaction挤压': 'risk-warning',
      '数据倾斜': 'risk-info',
      'log文件过大': 'risk-warning',
      'compaction失败': 'risk-error',
      'clean失败': 'risk-error',
      'archive失败': 'risk-error'
    };
    return classMap[riskType] || 'risk-info';
  }
}
