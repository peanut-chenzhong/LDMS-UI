import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TiTableModule } from '@opentiny/ng-table';
import { TiButtonModule } from '@opentiny/ng-button';
import { TiSelectModule } from '@opentiny/ng-select';
import { TiPaginationModule } from '@opentiny/ng-pagination';

interface RiskItem {
  id: string;
  database: string;
  tablename: string;
  riskType: string;
  alertTime: string;
  reason: string;
}

@Component({
  selector: 'app-risk-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    TiTableModule,
    TiButtonModule,
    TiSelectModule,
    TiPaginationModule
  ],
  templateUrl: './risk-list.html',
  styleUrl: './risk-list.scss'
})
export class RiskListComponent implements OnInit {
  // 数据
  allRisks: RiskItem[] = [];
  filteredRisks: RiskItem[] = [];
  displayedRisks: RiskItem[] = [];

  // tiny-ng 表格数据源
  srcData = {
    data: [] as RiskItem[],
    state: {
      searched: false,
      sorted: false,
      paginated: true
    }
  };

  // tiny-ng 分页配置
  pagination = {
    currentPage: 1,
    pageSize: {
      options: [10, 20, 30, 50, 100],
      size: 10
    } as any,
    totalNumber: 0
  };

  // 搜索
  searchDatabase = '';
  searchTableName = '';
  selectedRiskType: any = null;

  // 排序
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // 下拉选项（tiny-ng 格式）
  allDatabases: any[] = [];
  allTableNames: any[] = [];
  selectedDatabase: any = null;
  selectedTableName: any = null;

  // 风险类型选项（tiny-ng 格式）
  riskTypeOptions = [
    { value: '', label: '全部类型' },
    { value: 'metadata_bloat', label: '元数据膨胀' },
    { value: 'schema_bloat', label: 'schema膨胀' },
    { value: 'compaction_backlog', label: 'compaction积压' },
    { value: 'compaction_abnormal', label: 'compaction异常' },
    { value: 'clean_abnormal', label: 'clean异常' },
    { value: 'archive_abnormal', label: 'archive异常' }
  ];

  // 表格列配置
  displayedColumns = [
    { title: '数据库名', field: 'database', width: '120px' },
    { title: '表名', field: 'tablename', width: '180px' },
    { title: '风险类型', field: 'riskType', width: '130px' },
    { title: '预警时间', field: 'alertTime', width: '160px', sortable: true },
    { title: '原因', field: 'reason', width: 'auto' }
  ];

  ngOnInit(): void {
    this.generateMockData();
    this.filteredRisks = [...this.allRisks];
    this.pagination.totalNumber = this.filteredRisks.length;
    this.extractSearchOptions();
    this.updateTableData();
  }

  generateMockData(): void {
    const databases = ['hive_prod', 'hive_test', 'spark_warehouse', 'data_lake', 'analytics_db'];
    const tableNames = ['user_info', 'order_detail', 'product_catalog', 'transaction_log', 'session_data', 'event_tracking', 'inventory', 'customer_profile'];
    
    const riskTypes = [
      { type: 'metadata_bloat', label: '元数据膨胀' },
      { type: 'schema_bloat', label: 'schema膨胀' },
      { type: 'compaction_backlog', label: 'compaction积压' },
      { type: 'compaction_abnormal', label: 'compaction异常' },
      { type: 'clean_abnormal', label: 'clean异常' },
      { type: 'archive_abnormal', label: 'archive异常' }
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
      'compaction_abnormal': [
        'Compaction任务执行异常，错误：OutOfMemoryError，建议增加executor内存',
        '最近3次compaction连续异常，异常原因：数据文件损坏',
        'Compaction执行超时，已运行：4小时，超过阈值：2小时',
        'Compaction过程中出现数据不一致，建议检查文件完整性'
      ],
      'clean_abnormal': [
        'Clean任务执行异常，错误：无法删除文件，权限不足',
        '清理任务异常，存在被引用的历史版本无法删除',
        'Clean操作异常中断，部分文件未能清理，建议手动检查',
        'Clean过程中检测到文件锁定，建议检查并发访问'
      ],
      'archive_abnormal': [
        'Archive任务执行异常，目标存储空间不足',
        '归档执行超时，大文件传输失败，建议分批执行',
        'Archive操作异常，错误：网络连接中断，建议重试',
        'Archive过程中文件校验失败，建议检查源文件完整性'
      ]
    };

    for (let i = 1; i <= 156; i++) {
      const db = databases[Math.floor(Math.random() * databases.length)];
      const table = tableNames[Math.floor(Math.random() * tableNames.length)];
      const riskInfo = riskTypes[Math.floor(Math.random() * riskTypes.length)];
      const reasonList = reasons[riskInfo.type];
      const reason = reasonList[Math.floor(Math.random() * reasonList.length)];

      // 生成预警时间（过去30天内的随机时间）
      const alertTime = this.randomDateTime(30);

      this.allRisks.push({
        id: `risk_${String(i).padStart(4, '0')}`,
        database: db,
        tablename: `${table}_${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`,
        riskType: riskInfo.label,
        alertTime,
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

    // 转换为 tiny-ng select 需要的格式
    this.allDatabases = Array.from(databases).sort().map(db => ({
      label: db,
      value: db
    }));
    this.allTableNames = Array.from(tableNames).sort().map(table => ({
      label: table,
      value: table
    }));
  }

  // 更新表格数据
  updateTableData(): void {
    const start = (this.pagination.currentPage - 1) * this.pagination.pageSize.size;
    const end = start + this.pagination.pageSize.size;
    const paginatedData = this.filteredRisks.slice(start, end);
    
    this.srcData = {
      data: paginatedData,
      state: {
        searched: true,
        sorted: !!this.sortField,
        paginated: true
      }
    };
    
    this.displayedRisks = [...paginatedData];
  }

  filterRisks(): void {
    this.filteredRisks = this.allRisks.filter(risk => {
      const dbMatch = !this.selectedDatabase || 
        risk.database.toLowerCase().includes(this.selectedDatabase.value.toLowerCase());
      const tableMatch = !this.selectedTableName || 
        risk.tablename.toLowerCase().includes(this.selectedTableName.value.toLowerCase());
      const typeMatch = !this.selectedRiskType || !this.selectedRiskType.value ||
        risk.riskType === this.selectedRiskType.label;
      return dbMatch && tableMatch && typeMatch;
    });
    
    // 如果有排序，应用排序
    if (this.sortField) {
      this.applySort();
    } else {
      this.pagination.currentPage = 1;
      this.pagination.totalNumber = this.filteredRisks.length;
      this.updateTableData();
    }
  }

  onSearch(): void {
    this.filterRisks();
  }

  onReset(): void {
    this.selectedDatabase = null;
    this.selectedTableName = null;
    this.selectedRiskType = null;
    this.sortField = '';
    this.sortDirection = 'asc';
    this.filteredRisks = [...this.allRisks];
    this.pagination.currentPage = 1;
    this.pagination.totalNumber = this.filteredRisks.length;
    this.updateTableData();
  }

  // 排序
  onSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applySort();
  }

  applySort(): void {
    this.filteredRisks.sort((a, b) => {
      const aVal = (a as any)[this.sortField];
      const bVal = (b as any)[this.sortField];
      const modifier = this.sortDirection === 'asc' ? 1 : -1;
      
      // 日期时间排序（格式：YYYY-MM-DD HH:mm:ss）
      if (this.sortField === 'alertTime') {
        const aDate = new Date(aVal).getTime();
        const bDate = new Date(bVal).getTime();
        return (aDate - bDate) * modifier;
      }
      
      // 字符串排序
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * modifier;
      }
      
      return 0;
    });
    
    this.pagination.currentPage = 1;
    this.pagination.totalNumber = this.filteredRisks.length;
    this.updateTableData();
  }

  // tiny-ng 分页事件处理
  onPageUpdate(event: any): void {
    this.pagination.currentPage = event.currentPage;
    this.pagination.pageSize.size = event.size;
    this.updateTableData();
  }

  // 生成随机日期时间（过去N天内）
  randomDateTime(daysBack: number): string {
    const now = new Date();
    const past = new Date(now.getTime() - Math.random() * daysBack * 24 * 60 * 60 * 1000);
    return past.toISOString().slice(0, 19).replace('T', ' ');
  }

  // 获取风险类型的样式类
  getRiskTypeClass(riskType: string): string {
    const classMap: Record<string, string> = {
      '元数据膨胀': 'risk-warning',
      'schema膨胀': 'risk-warning',
      'compaction积压': 'risk-warning',
      'compaction异常': 'risk-error',
      'clean异常': 'risk-error',
      'archive异常': 'risk-error'
    };
    return classMap[riskType] || 'risk-warning';
  }
}
