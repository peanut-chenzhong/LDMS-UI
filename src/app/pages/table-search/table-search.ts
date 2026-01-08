import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, Chart, registerables } from 'chart.js';

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
  tablepartitions: number;
  uncommittedCount: number;
  activeCommitCount: number;
  rollbackCount: number;
  schemaversion: number;
}

@Component({
  selector: 'app-table-search',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './table-search.html',
  styleUrl: './table-search.scss'
})
export class TableSearchComponent implements OnInit {
  // 筛选条件
  filters = {
    database: '',
    tableName: ''
  };

  // 下拉选项
  databases = ['hive_prod', 'hive_test', 'spark_warehouse', 'data_lake', 'analytics_db'];
  tableNames = ['user_info', 'order_detail', 'product_catalog', 'transaction_log', 'session_data', 'event_tracking', 'inventory', 'customer_profile'];

  // 固定列（不可拖拽）
  fixedColumns: ColumnDef[] = [
    { key: 'database', label: 'database' },
    { key: 'tablename', label: 'tablename' },
    { key: 'createtime', label: 'createtime' },
    { key: 'tabletype', label: 'tabletype' }
  ];

  // 可拖拽列（全部支持排序）
  draggableColumns: ColumnDef[] = [
    { key: 'tablesize', label: 'tablesize', sortable: true },
    { key: 'filenumber', label: 'filenumber', sortable: true },
    { key: 'tableindex', label: 'tableindex', sortable: true },
    { key: 'tablepartitions', label: 'tablepartitions', sortable: true },
    { key: 'lastcommittime', label: 'lastcommittime', sortable: true },
    { key: 'lastcompletecompactiontime', label: 'lastcompletecompactiontime', sortable: true },
    { key: 'lastcleantime', label: 'lastcleantime', sortable: true },
    { key: 'archivelogsize', label: 'archivelogsize', sortable: true },
    { key: 'schemaversion', label: 'schemaversion', sortable: true },
    { key: 'updatatime', label: 'updatatime', sortable: true }
  ];

  // 拖拽状态
  dragIndex: number = -1;
  dragOverIndex: number = -1;

  // 排序
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // 分页
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [10, 20, 30, 50, 100];

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

  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.pageSize) || 1;
  }

  get paginatedData(): TableRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredData.slice(start, start + this.pageSize);
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
    this.filteredData = [...this.allData];
  }

  generateMockData(): void {
    const types = ['COW', 'MOR', 'MOW'];
    
    for (let i = 1; i <= 56; i++) {
      const dbIndex = Math.floor(Math.random() * this.databases.length);
      const tableIndex = Math.floor(Math.random() * this.tableNames.length);
      
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
        database: this.databases[dbIndex],
        tablename: `${this.tableNames[tableIndex]}_${String(i).padStart(3, '0')}`,
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
      const dbMatch = !this.filters.database || row.database === this.filters.database;
      const tableMatch = !this.filters.tableName || row.tablename.includes(this.filters.tableName);
      return dbMatch && tableMatch;
    });
    this.currentPage = 1;
    if (this.sortField) {
      this.applySort();
    }
  }

  onReset(): void {
    this.filters = { database: '', tableName: '' };
    this.sortField = '';
    this.sortDirection = 'asc';
    this.filteredData = [...this.allData];
    this.currentPage = 1;
    this.selectedRow = null;
  }

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
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
  }

  // 列拖拽 - 开始拖拽
  onDragStart(event: DragEvent, index: number): void {
    this.dragIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  // 列拖拽 - 拖拽经过
  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverIndex = index;
  }

  // 列拖拽 - 拖拽结束
  onDragEnd(): void {
    this.dragIndex = -1;
    this.dragOverIndex = -1;
  }

  // 列拖拽 - 放置
  onDrop(event: DragEvent, targetIndex: number): void {
    event.preventDefault();
    if (this.dragIndex !== -1 && this.dragIndex !== targetIndex) {
      const column = this.draggableColumns[this.dragIndex];
      this.draggableColumns.splice(this.dragIndex, 1);
      this.draggableColumns.splice(targetIndex, 0, column);
    }
    this.dragIndex = -1;
    this.dragOverIndex = -1;
  }

  // 选择行
  onRowSelect(row: TableRow): void {
    if (this.selectedRow === row) {
      this.selectedRow = null;
    } else {
      this.selectedRow = row;
      this.generateHistoryData(row);
    }
  }

  // 生成30天历史数据
  generateHistoryData(row: TableRow): void {
    this.historyData = [];
    const today = new Date();
    
    // 基础值
    let tablesize = row.tablesize as number;
    let filenumber = row.filenumber as number;
    let tablepartitions = row.tablepartitions as number;
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
        tablepartitions: Math.round(tablepartitions * (0.9 + i * 0.003 + Math.random() * 0.02)),
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
          label: '分区数',
          data: this.historyData.map(d => d.tablepartitions),
          borderColor: '#f5a623',
          backgroundColor: 'rgba(245, 166, 35, 0.1)',
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
