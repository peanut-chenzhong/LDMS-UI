import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, Chart, registerables } from 'chart.js';
import { TiTableModule } from '@opentiny/ng-table';
import { TiButtonModule } from '@opentiny/ng-button';
import { TiSelectModule } from '@opentiny/ng-select';
import { TiPaginationModule } from '@opentiny/ng-pagination';
import { TiDropsearchModule } from '@opentiny/ng-dropsearch';

// 注册 Chart.js 组件
Chart.register(...registerables);

interface TableRow {
  database: string;
  tablename: string;
  createtime: string;
  tabletype: string;
  tablesize: number;
  filenumber: number;
  tableindex: string;
  tablepartitions: number;
  lastcommittime: string;
  lastcompletecompactiontime: string;
  lastcleantime: string;
  archivelogsize: number;
  schemaversion: number;
  updatatime: string;
  [key: string]: string | number;
}

interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
}

interface HistoryData {
  date: string;
  tablesize: number;
  filenumber: number;
  uncommittedCount: number;
  activeCommitCount: number;
  rollbackCount: number;
  schemaversion: number;
}

@Component({
  selector: 'app-table-search',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    BaseChartDirective,
    TiTableModule,
    TiButtonModule,
    TiSelectModule,
    TiPaginationModule,
    TiDropsearchModule
  ],
  templateUrl: './table-search.html',
  styleUrl: './table-search.scss'
})
export class TableSearchComponent implements OnInit {
  // 筛选条件
  filters = {
    database: '',
    tableName: ''
  };

  // 下拉选项（从实际数据中提取）
  allDatabases: any[] = [];
  allTableNames: any[] = [];
  
  // 选中的数据库和表名
  selectedDatabase: any = null;
  selectedTableName: any = null;

  // 表格列配置（使用 tiny-ng 表格格式）
  displayedColumns: any[] = [
    { 
      title: 'database', 
      field: 'database',
      width: '120px',
      fixed: 'left'
    },
    { 
      title: 'tablename', 
      field: 'tablename',
      width: '150px',
      fixed: 'left'
    },
    { 
      title: 'createtime', 
      field: 'createtime',
      width: '160px',
      fixed: 'left'
    },
    { 
      title: 'tabletype', 
      field: 'tabletype',
      width: '100px',
      fixed: 'left'
    },
    { 
      title: 'tablesize', 
      field: 'tablesize',
      width: '120px',
      sortable: true
    },
    { 
      title: 'filenumber', 
      field: 'filenumber',
      width: '120px',
      sortable: true
    },
    { 
      title: 'tableindex', 
      field: 'tableindex',
      width: '120px',
      sortable: true
    },
    { 
      title: 'lastcommittime', 
      field: 'lastcommittime',
      width: '180px',
      sortable: true
    },
    { 
      title: 'lastcompletecompactiontime', 
      field: 'lastcompletecompactiontime',
      width: '220px',
      sortable: true
    },
    { 
      title: 'lastcleantime', 
      field: 'lastcleantime',
      width: '180px',
      sortable: true
    },
    { 
      title: 'archivelogsize', 
      field: 'archivelogsize',
      width: '140px',
      sortable: true
    },
    { 
      title: 'schemaversion', 
      field: 'schemaversion',
      width: '130px',
      sortable: true
    },
    { 
      title: 'updatatime', 
      field: 'updatatime',
      width: '160px',
      sortable: true
    }
  ];

  // 表格数据源（tiny-ng 格式）
  srcData = {
    data: [] as TableRow[],
    state: {
      searched: false,
      sorted: false,
      paginated: false
    }
  };
  
  displayedData: TableRow[] = [];

  // 排序
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // 分页配置
  pagination = {
    currentPage: 1,
    pageSize: {
      options: [10, 20, 30, 50, 100],
      size: 10
    } as any,
    totalNumber: 0
  };
  
  // 当前每页显示数量（用于下拉选择器）
  currentPageSize: number = 10;

  // 数据
  allData: TableRow[] = [];
  filteredData: TableRow[] = [];

  // 选中行
  selectedRow: TableRow | null = null;

  // 图表数据
  historyData: HistoryData[] = [];

  // 图表配置
  lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1a1a1a',
        bodyColor: '#575d6c',
        borderColor: '#dcdee5',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          },
          color: '#575d6c'
        }
      },
      y: {
        grid: {
          color: '#f0f0f0'
        },
        ticks: {
          font: {
            size: 11
          },
          color: '#575d6c'
        }
      }
    }
  };

  // 获取分页后的数据
  get paginatedData(): TableRow[] {
    const start = (this.pagination.currentPage - 1) * this.pagination.pageSize.size;
    return this.filteredData.slice(start, start + this.pagination.pageSize.size);
  }

  ngOnInit(): void {
    this.generateMockData();
    this.filteredData = [...this.allData];
    this.pagination.totalNumber = this.filteredData.length;
    this.extractSearchOptions();
    this.updateTableData();
  }

  // 从数据中提取搜索选项
  extractSearchOptions(): void {
    const databases = new Set<string>();
    const tableNames = new Set<string>();

    this.allData.forEach(row => {
      databases.add(row.database);
      tableNames.add(row.tablename);
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

  generateMockData(): void {
    const types = ['COW', 'MOR', 'MOW'];
    // 用于生成模拟数据的固定列表
    const databases = ['hive_prod', 'hive_test', 'spark_warehouse', 'data_lake', 'analytics_db'];
    const tableNames = ['user_info', 'order_detail', 'product_catalog', 'transaction_log', 'session_data', 'event_tracking', 'inventory', 'customer_profile'];
    
    for (let i = 1; i <= 56; i++) {
      const dbIndex = Math.floor(Math.random() * databases.length);
      const tableIndex = Math.floor(Math.random() * tableNames.length);
      
      // 生成 tableindex: BLOOM, SIMPLE 或 BUCKET+数字
      let tableIndexValue: string;
      const indexRandom = Math.random();
      if (indexRandom < 0.3) {
        tableIndexValue = 'BLOOM';
      } else if (indexRandom < 0.6) {
        tableIndexValue = 'SIMPLE';
      } else {
        tableIndexValue = `BUCKET${Math.floor(Math.random() * 100) + 1}`;
      }
      
      this.allData.push({
        database: databases[dbIndex],
        tablename: `${tableNames[tableIndex]}_${String(i).padStart(3, '0')}`,
        createtime: this.randomDate('2023-01-01', '2024-06-01'),
        tabletype: types[Math.floor(Math.random() * types.length)],
        tablesize: Math.floor(Math.random() * 50000) + 100,
        filenumber: Math.floor(Math.random() * 500) + 1,
        tableindex: tableIndexValue,
        tablepartitions: Math.floor(Math.random() * 100),
        lastcommittime: this.randomDateCompact('2024-01-01', '2024-12-01'),
        lastcompletecompactiontime: this.randomDateCompact('2024-01-01', '2024-12-01'),
        lastcleantime: this.randomDateCompact('2024-01-01', '2024-12-01'),
        archivelogsize: Math.floor(Math.random() * 10000),
        schemaversion: Math.floor(Math.random() * 50) + 1,
        updatatime: this.randomDate('2024-06-01', '2024-12-01')
      });
    }
  }

  randomDate(start: string, end: string): string {
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    const randomTime = startDate + Math.random() * (endDate - startDate);
    const date = new Date(randomTime);
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  // 生成 yyyyMMddHHmmssSSS 格式的时间
  randomDateCompact(start: string, end: string): string {
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    const randomTime = startDate + Math.random() * (endDate - startDate);
    const date = new Date(randomTime);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const millis = String(date.getMilliseconds()).padStart(3, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}${millis}`;
  }

  onSearch(): void {
    this.filteredData = this.allData.filter(row => {
      const dbMatch = !this.selectedDatabase || row.database === this.selectedDatabase.value;
      const tableMatch = !this.selectedTableName || row.tablename === this.selectedTableName.value;
      return dbMatch && tableMatch;
    });
    this.pagination.currentPage = 1;
    this.pagination.totalNumber = this.filteredData.length;
    
    // 如果有排序，先排序（applySort 会调用 updateTableData）
    if (this.sortField) {
      this.applySort();
    } else {
      this.updateTableData();
    }
  }

  onReset(): void {
    this.selectedDatabase = null;
    this.selectedTableName = null;
    this.sortField = '';
    this.sortDirection = 'asc';
    this.filteredData = [...this.allData];
    this.pagination.currentPage = 1;
    this.pagination.totalNumber = this.filteredData.length;
    this.selectedRow = null;
    this.updateTableData();
  }

  // 更新表格数据
  updateTableData(): void {
    // 计算分页数据
    const start = (this.pagination.currentPage - 1) * this.pagination.pageSize.size;
    const end = start + this.pagination.pageSize.size;
    const paginatedData = this.filteredData.slice(start, end);
    
    // 设置表格数据源（只传入当前页数据）
    this.srcData = {
      data: paginatedData,
      state: {
        searched: true,
        sorted: !!this.sortField,
        paginated: true
      }
    };
    
    // 同步更新显示数据
    this.displayedData = [...paginatedData];
  }

  onSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applySort(); // applySort 内部会调用 updateTableData
  }

  applySort(): void {
    this.filteredData.sort((a, b) => {
      const aVal = a[this.sortField];
      const bVal = b[this.sortField];
      const modifier = this.sortDirection === 'asc' ? 1 : -1;
      
      // 数字排序
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * modifier;
      }
      
      // 字符串排序
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * modifier;
      }
      
      return 0;
    });
    
    // 排序后更新表格显示
    this.updateTableData();
  }

  // 分页变化（页码变化）
  onPageChange(page: any): void {
    const pageNum = typeof page === 'number' ? page : parseInt(page, 10);
    if (pageNum && pageNum !== this.pagination.currentPage) {
      this.pagination.currentPage = pageNum;
      this.updateTableData();
    }
  }

  onPageSizeChange(event: any): void {
    // 处理 pageSize 变化事件
    const newSize = typeof event === 'number' ? event : (event.size || event);
    this.pagination.pageSize.size = newSize;
    this.currentPageSize = newSize;
    this.pagination.currentPage = 1; // 重置到第一页
    this.updateTableData();
  }
  
  // 处理下拉选择器的 pageSize 变化
  onPageSizeSelectChange(size: any): void {
    const newSize = parseInt(size, 10);
    this.pagination.pageSize.size = newSize;
    this.currentPageSize = newSize;
    this.pagination.currentPage = 1; // 重置到第一页
    this.updateTableData();
  }
  
  // 处理 tiny-ng 分页组件的 pageUpdate 事件
  // TiPaginationEvent: { currentPage: number, size: number, totalNumber: number }
  onPageUpdate(event: any): void {
    this.pagination.currentPage = event.currentPage;
    this.pagination.pageSize.size = event.size;
    this.currentPageSize = event.size;
    this.updateTableData();
  }

  // 表格状态更新（排序、分页、搜索）
  onStateUpdate(table: any): void {
    // 由于我们手动管理分页，此方法可以为空或只处理特定事件
    // 排序已通过列头点击处理
    // 分页已通过 ti-pagination 组件处理
  }
  
  // 选择行（从 displayedDataChange 事件处理）
  onDisplayedDataChange(data: any[]): void {
    // 这里可以通过其他方式处理行选择
  }

  // 处理行点击选择（通过表格行点击事件）
  onRowClick(row: TableRow): void {
    if (this.selectedRow === row) {
      this.selectedRow = null;
    } else {
      this.selectedRow = row;
      this.generateHistoryData(row);
    }
  }

  // TrackBy 函数
  trackByTablename(index: number, item: TableRow): string {
    return item.tablename;
  }

  // 生成30天历史数据
  generateHistoryData(row: TableRow): void {
    this.historyData = [];
    const today = new Date();
    
    // 基础值
    let tablesize = row.tablesize as number;
    let filenumber = row.filenumber as number;
    let schemaversion = row.schemaversion as number;
    
    // 生成30天数据（从30天前到今天）
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // 模拟数据波动
      const dayVariation = Math.sin(i * 0.3) * 0.1 + (Math.random() - 0.5) * 0.05;
      
      this.historyData.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        tablesize: Math.round(tablesize * (0.7 + i * 0.01 + dayVariation)),
        filenumber: Math.round(filenumber * (0.8 + i * 0.007 + dayVariation * 0.5)),
        uncommittedCount: Math.floor(Math.random() * 20) + Math.floor(Math.sin(i * 0.5) * 5) + 5,
        activeCommitCount: Math.floor(Math.random() * 30) + Math.floor(Math.cos(i * 0.4) * 10) + 10,
        rollbackCount: Math.floor(Math.random() * 10) + Math.floor(Math.abs(Math.sin(i * 0.6)) * 5),
        schemaversion: Math.max(1, schemaversion - Math.floor((29 - i) / 10))
      });
    }
    
    this.updateChartData();
  }

  // 更新图表数据
  updateChartData(): void {
    this.lineChartData = {
      labels: this.historyData.map(d => d.date),
      datasets: [
        {
          label: '表大小',
          data: this.historyData.map(d => d.tablesize),
          borderColor: '#0070cc',
          backgroundColor: 'rgba(0, 112, 204, 0.1)',
          tension: 0.3,
          fill: false,
          pointRadius: 2,
          pointHoverRadius: 5
        },
        {
          label: '文件数',
          data: this.historyData.map(d => d.filenumber),
          borderColor: '#00b386',
          backgroundColor: 'rgba(0, 179, 134, 0.1)',
          tension: 0.3,
          fill: false,
          pointRadius: 2,
          pointHoverRadius: 5
        },
        {
          label: '未完成commit数',
          data: this.historyData.map(d => d.uncommittedCount),
          borderColor: '#e6483d',
          backgroundColor: 'rgba(230, 72, 61, 0.1)',
          tension: 0.3,
          fill: false,
          pointRadius: 2,
          pointHoverRadius: 5
        },
        {
          label: 'active commit数',
          data: this.historyData.map(d => d.activeCommitCount),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.3,
          fill: false,
          pointRadius: 2,
          pointHoverRadius: 5
        },
        {
          label: 'rollback数',
          data: this.historyData.map(d => d.rollbackCount),
          borderColor: '#ec4899',
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          tension: 0.3,
          fill: false,
          pointRadius: 2,
          pointHoverRadius: 5
        },
        {
          label: 'schema版本',
          data: this.historyData.map(d => d.schemaversion),
          borderColor: '#6b7280',
          backgroundColor: 'rgba(107, 114, 128, 0.1)',
          tension: 0.3,
          fill: false,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderDash: [5, 5]
        }
      ]
    };
  }
}
