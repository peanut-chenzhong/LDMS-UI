import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { TiTableModule } from '@opentiny/ng-table';
import { TiButtonModule } from '@opentiny/ng-button';
import { TiSelectModule } from '@opentiny/ng-select';
import { TiPaginationModule } from '@opentiny/ng-pagination';

interface TaskExecution {
  id: string;
  startTime: string;
  endTime: string;
  appId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
}

interface AnalysisTask {
  id: string;
  taskName: string;
  createTime: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  tables: string[];
  startTime: string;
  endTime: string;
  appId: string;
  analysisTypes: string[];  // 分析项列表
  executions: TaskExecution[];  // 执行历史记录
}

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    TiTableModule,
    TiButtonModule,
    TiSelectModule,
    TiPaginationModule
  ],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss'
})
export class TaskListComponent implements OnInit {
  // 数据
  allTasks: AnalysisTask[] = [];
  filteredTasks: AnalysisTask[] = [];
  displayedTasks: AnalysisTask[] = [];

  // tiny-ng 表格数据源
  srcData = {
    data: [] as AnalysisTask[],
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

  // 排序
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // 表列表弹窗
  showTablesModal = false;
  modalTables: string[] = [];
  modalTaskName = '';

  // 展开的任务行
  expandedTaskId: string | null = null;

  // 状态筛选（tiny-ng 格式）
  selectedStatus: any = null;
  statusOptions = [
    { value: '', label: '全部状态' },
    { value: 'pending', label: '待执行' },
    { value: 'running', label: '运行中' },
    { value: 'completed', label: '已完成' },
    { value: 'failed', label: '失败' },
    { value: 'stopped', label: '已停止' }
  ];

  // 任务名搜索
  searchTaskName = '';

  // 表搜索（tiny-ng 格式）
  selectedSearchDatabase: any = null;
  selectedSearchTableName: any = null;

  // 搜索下拉选项（tiny-ng 格式）
  allDatabases: any[] = [];
  allTableNames: any[] = [];

  // 新增任务弹窗
  showCreateModal = false;
  newTaskName = '';  // 用户输入的任务名
  analysisOptions = [
    { key: 'compaction', label: 'compaction分析', checked: false },
    { key: 'clean', label: 'clean分析', checked: false },
    { key: 'archive', label: 'archive分析', checked: false }
  ];
  
  // 分区存储分析选项
  partitionAnalysisEnabled = false;
  partitionAnalysisMode = 'recent_compaction';  // 'full_scan' | 'recent_compaction' | 'specified_commit'
  partitionAnalysisModes = [
    { value: 'recent_compaction', label: '从最近compaction扫描' },
    { value: 'full_scan', label: '全表扫描' },
    { value: 'specified_commit', label: '从指定commit时间扫描' }
  ];
  specifiedCommitTime = '';  // yyyyMMddHHmmssSSS 格式
  selectedDatabase = '';
  availableTables: string[] = [];
  selectedTables: string[] = [];

  // 表名搜索
  tableSearchKeyword = '';

  // 模拟数据库和表的映射
  databaseTables: Record<string, string[]> = {
    'hive_prod': ['user_info_001', 'user_info_002', 'order_detail_001', 'order_detail_002', 'product_catalog_001', 'transaction_log_001', 'session_data_001'],
    'hive_test': ['user_info_test_001', 'order_detail_test_001', 'product_catalog_test_001', 'event_tracking_test_001'],
    'spark_warehouse': ['user_profile_001', 'user_profile_002', 'behavior_log_001', 'behavior_log_002', 'feature_store_001'],
    'data_lake': ['raw_events_001', 'raw_events_002', 'processed_data_001', 'aggregated_metrics_001', 'ml_features_001'],
    'analytics_db': ['daily_report_001', 'weekly_summary_001', 'monthly_stats_001', 'user_segments_001', 'conversion_funnel_001']
  };
  databaseList = Object.keys(this.databaseTables);

  ngOnInit(): void {
    this.generateMockData();
    this.filteredTasks = [...this.allTasks];
    this.pagination.totalNumber = this.filteredTasks.length;
    this.extractSearchOptions();
    this.updateTableData();
  }

  // 更新表格数据
  updateTableData(): void {
    const start = (this.pagination.currentPage - 1) * this.pagination.pageSize.size;
    const end = start + this.pagination.pageSize.size;
    const paginatedData = this.filteredTasks.slice(start, end);
    
    this.srcData = {
      data: paginatedData,
      state: {
        searched: true,
        sorted: !!this.sortField,
        paginated: true
      }
    };
    
    this.displayedTasks = [...paginatedData];
  }

  // tiny-ng 分页事件处理
  onPageUpdate(event: any): void {
    this.pagination.currentPage = event.currentPage;
    this.pagination.pageSize.size = event.size;
    this.updateTableData();
  }

  // 从任务数据中提取搜索选项
  extractSearchOptions(): void {
    const databases = new Set<string>();
    const tableNames = new Set<string>();

    this.allTasks.forEach(task => {
      task.tables.forEach(fullName => {
        const [db, table] = fullName.split('.');
        databases.add(db);
        tableNames.add(table);
      });
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
    const taskPrefixes = ['daily_analysis', 'weekly_report', 'data_quality', 'performance_check', 'schema_validation', 'partition_audit', 'compaction_monitor'];
    const databases = ['hive_prod', 'hive_test', 'spark_warehouse', 'data_lake', 'analytics_db'];
    const tableNames = ['user_info', 'order_detail', 'product_catalog', 'transaction_log', 'session_data', 'event_tracking'];
    const statuses: AnalysisTask['status'][] = ['pending', 'running', 'completed', 'failed', 'stopped'];
    const allAnalysisTypes = ['compaction分析', 'clean分析', 'archive分析', '分区存储分析(从最近compaction扫描)', '分区存储分析(全表扫描)'];

    for (let i = 1; i <= 68; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const createTime = this.randomDateTime(30);
      const startTime = status !== 'pending' ? this.addMinutes(createTime, Math.floor(Math.random() * 10)) : '-';
      const endTime = (status === 'completed' || status === 'failed' || status === 'stopped') 
        ? this.addMinutes(startTime, Math.floor(Math.random() * 120) + 5) 
        : '-';

      // 生成随机表集合
      const tableCount = Math.floor(Math.random() * 5) + 1;
      const tables: string[] = [];
      for (let j = 0; j < tableCount; j++) {
        const db = databases[Math.floor(Math.random() * databases.length)];
        const table = tableNames[Math.floor(Math.random() * tableNames.length)];
        const fullName = `${db}.${table}_${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`;
        if (!tables.includes(fullName)) {
          tables.push(fullName);
        }
      }

      // 随机选择1-5个分析项
      const analysisCount = Math.floor(Math.random() * 5) + 1;
      const shuffled = [...allAnalysisTypes].sort(() => Math.random() - 0.5);
      const analysisTypes = shuffled.slice(0, analysisCount);

      // 生成友好的任务名
      const taskPrefix = taskPrefixes[Math.floor(Math.random() * taskPrefixes.length)];
      const taskSuffix = String(i).padStart(3, '0');
      const friendlyTaskName = `${taskPrefix}_${taskSuffix}`;

      // 生成执行历史记录（1-5条）
      const executionCount = Math.floor(Math.random() * 5) + 1;
      const executions: TaskExecution[] = [];
      let latestExecution: TaskExecution | null = null;

      for (let j = 0; j < executionCount; j++) {
        const execStatus: ('pending' | 'running' | 'completed' | 'failed' | 'stopped') = 
          j === executionCount - 1 ? status : 
          (Math.random() > 0.3 ? 'completed' : (Math.random() > 0.5 ? 'failed' : 'stopped'));
        
        const execStartTime = j === 0 ? startTime : this.addMinutes(createTime, -Math.floor(Math.random() * 10080)); // 最多7天前
        const execEndTime = execStatus === 'pending' || execStatus === 'running' ? '-' : 
          this.addMinutes(execStartTime, Math.floor(Math.random() * 480) + 30); // 30分钟到8小时
        
        const execAppId = execStatus !== 'pending' ? 
          `application_${Date.now() - Math.floor(Math.random() * 10000000) - j * 1000000}_${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}` : '-';
        
        const execution: TaskExecution = {
          id: `exec_${String(i).padStart(4, '0')}_${String(j + 1).padStart(3, '0')}`,
          startTime: execStartTime,
          endTime: execEndTime,
          appId: execAppId,
          status: execStatus
        };
        
        executions.push(execution);
        if (j === executionCount - 1) {
          latestExecution = execution;
        }
      }

      // 使用最新执行记录的信息作为任务的主要信息
      const mainExecution = latestExecution || executions[executions.length - 1];

      this.allTasks.push({
        id: `task_${String(i).padStart(4, '0')}`,
        taskName: friendlyTaskName,
        createTime,
        status: mainExecution.status,
        tables,
        startTime: mainExecution.startTime,
        endTime: mainExecution.endTime,
        appId: mainExecution.appId,
        analysisTypes,
        executions: executions.reverse() // 最新的在前
      });
    }

    // 按创建时间倒序排序
    this.allTasks.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
  }

  randomDateTime(daysBack: number): string {
    const now = new Date();
    const past = new Date(now.getTime() - Math.random() * daysBack * 24 * 60 * 60 * 1000);
    return past.toISOString().slice(0, 19).replace('T', ' ');
  }

  addMinutes(dateStr: string, minutes: number): string {
    if (dateStr === '-') return '-';
    const date = new Date(dateStr);
    date.setMinutes(date.getMinutes() + minutes);
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  onStatusFilterChange(): void {
    this.filterTasks();
  }

  filterTasks(): void {
    this.filteredTasks = this.allTasks.filter(task => {
      // 状态过滤
      if (this.selectedStatus && this.selectedStatus.value && task.status !== this.selectedStatus.value) {
        return false;
      }
      
      // 任务名搜索过滤
      if (this.searchTaskName) {
        const taskNameSearch = this.searchTaskName.toLowerCase().trim();
        if (!task.taskName.toLowerCase().includes(taskNameSearch)) {
          return false;
        }
      }
      
      // 表搜索过滤
      const dbSearch = this.selectedSearchDatabase ? this.selectedSearchDatabase.value.toLowerCase().trim() : '';
      const tableSearch = this.selectedSearchTableName ? this.selectedSearchTableName.value.toLowerCase().trim() : '';
      
      if (dbSearch || tableSearch) {
        // 检查任务的表列表中是否有匹配的表
        const hasMatchingTable = task.tables.some(tableName => {
          const [db, table] = tableName.split('.');
          const dbMatch = !dbSearch || db.toLowerCase().includes(dbSearch);
          const tableMatch = !tableSearch || table.toLowerCase().includes(tableSearch);
          return dbMatch && tableMatch;
        });
        
        if (!hasMatchingTable) {
          return false;
        }
      }
      
      return true;
    });
    
    if (this.sortField) {
      this.applySort();
    } else {
      this.pagination.currentPage = 1;
      this.pagination.totalNumber = this.filteredTasks.length;
      this.updateTableData();
    }
  }

  onSearch(): void {
    this.filterTasks();
  }

  onReset(): void {
    this.selectedStatus = null;
    this.searchTaskName = '';
    this.selectedSearchDatabase = null;
    this.selectedSearchTableName = null;
    this.filteredTasks = [...this.allTasks];
    this.pagination.currentPage = 1;
    this.pagination.totalNumber = this.filteredTasks.length;
    this.updateTableData();
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
    const statusOrder: Record<string, number> = {
      'running': 1,
      'pending': 2,
      'completed': 3,
      'failed': 4,
      'stopped': 5
    };

    this.filteredTasks.sort((a, b) => {
      let aVal: any = (a as any)[this.sortField];
      let bVal: any = (b as any)[this.sortField];
      const modifier = this.sortDirection === 'asc' ? 1 : -1;

      // 状态排序使用预定义顺序
      if (this.sortField === 'status') {
        aVal = statusOrder[aVal] || 99;
        bVal = statusOrder[bVal] || 99;
        return (aVal - bVal) * modifier;
      }

      // 表数量排序
      if (this.sortField === 'tableCount') {
        return (a.tables.length - b.tables.length) * modifier;
      }

      // 时间排序（处理 '-' 的情况）
      if (this.sortField === 'createTime' || this.sortField === 'startTime' || this.sortField === 'endTime') {
        if (aVal === '-') aVal = this.sortDirection === 'asc' ? '9999-12-31' : '0000-01-01';
        if (bVal === '-') bVal = this.sortDirection === 'asc' ? '9999-12-31' : '0000-01-01';
        return aVal.localeCompare(bVal) * modifier;
      }

      // 字符串排序
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * modifier;
      }

      return 0;
    });
    
    this.pagination.currentPage = 1;
    this.pagination.totalNumber = this.filteredTasks.length;
    this.updateTableData();
  }

  // 获取状态样式类
  getStatusClass(status: string): string {
    const classMap: Record<string, string> = {
      'pending': 'status-pending',
      'running': 'status-running',
      'completed': 'status-completed',
      'failed': 'status-failed',
      'stopped': 'status-stopped'
    };
    return classMap[status] || '';
  }

  // 获取状态文本
  getStatusText(status: string): string {
    const textMap: Record<string, string> = {
      'pending': '待执行',
      'running': '运行中',
      'completed': '已完成',
      'failed': '失败',
      'stopped': '已停止'
    };
    return textMap[status] || status;
  }

  // 操作：查看报告 - 下载Excel（每个分析项一个sheet）
  viewReport(task: AnalysisTask): void {
    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 第一个 sheet 固定为 risk list，显示数据倾斜和log文件过大两种风险异常
    const riskListData = task.tables.map(fullTableName => {
      const [database, tablename] = fullTableName.split('.');
      return {
        database,
        tablename,
        '风险类型': '数据倾斜',
        '分析结果': this.generateRiskAnalysisResult('数据倾斜')
      };
    }).concat(
      task.tables.map(fullTableName => {
        const [database, tablename] = fullTableName.split('.');
        return {
          database,
          tablename,
          '风险类型': 'log文件过大',
          '分析结果': this.generateRiskAnalysisResult('log文件过大')
        };
      })
    );

    // 创建 risk list 工作表
    const riskListWorksheet = XLSX.utils.json_to_sheet(riskListData);
    
    // 设置列宽
    riskListWorksheet['!cols'] = [
      { wch: 20 },  // database
      { wch: 30 },  // tablename
      { wch: 18 },  // 风险类型
      { wch: 60 }   // 分析结果
    ];

    // 将 risk list 作为第一个 sheet
    XLSX.utils.book_append_sheet(workbook, riskListWorksheet, 'risk list');

    // 为每个分析项创建一个 sheet
    task.analysisTypes.forEach(analysisType => {
      const reportData = task.tables.map(fullTableName => {
        const [database, tablename] = fullTableName.split('.');
        return {
          database,
          tablename,
          result: this.generateAnalysisResult(analysisType)
        };
      });

      // 创建工作表
      const worksheet = XLSX.utils.json_to_sheet(reportData);
      
      // 设置列宽
      worksheet['!cols'] = [
        { wch: 20 },  // database
        { wch: 30 },  // tablename
        { wch: 60 }   // result
      ];

      // 获取 sheet 名称（去掉"分析"后缀，保持简短）
      const sheetName = analysisType.replace('分析', '');
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // 生成文件名
    const fileName = `analysis_report_${task.taskName.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // 下载文件
    XLSX.writeFile(workbook, fileName);
    
    console.log('下载报告:', task.taskName, '分析项:', task.analysisTypes);
  }

  // 生成风险异常分析结果
  generateRiskAnalysisResult(riskType: string): string {
    const riskResults: Record<string, string[]> = {
      '数据倾斜': [
        '最大分区大小：50GB，最小分区：500MB，倾斜比：100:1',
        '热点分区 dt=2024-01-08 数据量是平均值的20倍',
        '数据分布不均导致查询性能下降，最大bucket：12GB，最小bucket：100MB',
        '分区数据分布不均，最大分区是最小分区的10倍',
        '存在空分区，建议清理以减少元数据开销'
      ],
      'log文件过大': [
        'Archive日志大小：15GB，超过建议阈值1GB',
        '单个log文件大小：2.3GB，超过建议阈值128MB',
        '日志文件数量过多，当前数量：567个，建议执行archive操作',
        'Log文件累积过多，建议执行日志归档清理',
        '单个log文件超过2GB，影响读取性能，建议拆分'
      ]
    };

    const results = riskResults[riskType] || ['分析完成，无异常发现'];
    return results[Math.floor(Math.random() * results.length)];
  }

  // 根据分析类型生成模拟分析结果
  generateAnalysisResult(analysisType: string): string {
    const resultsByType: Record<string, string[]> = {
      'compaction分析': [
        'Compaction状态正常，无待处理任务',
        '发现3个未完成的compaction任务，建议执行compaction',
        '文件数过多(>500)，建议执行文件合并优化',
        '存在大量小文件(<1MB)，建议执行小文件合并',
        '最近compaction执行时间: 2小时前，状态正常'
      ],
      'clean分析': [
        'Clean状态正常，无过期数据',
        '存在5个过期分区，建议清理以释放存储空间',
        '发现过期快照数据，可释放约10GB空间',
        '历史版本文件过多，建议执行clean操作',
        '最近clean执行时间: 1天前，状态正常'
      ],
      'archive分析': [
        'Archive日志正常，大小在合理范围内',
        'Archive日志过大(>1GB)，建议执行归档清理',
        '存在过期的archive日志，可以安全删除',
        'Archive保留策略建议调整为7天',
        '最近archive清理时间: 3天前'
      ]
    };

    // 处理分区存储分析（两种模式）
    if (analysisType.includes('分区存储分析')) {
      const partitionResults = [
        '分区存储正常，数据分布均匀',
        '分区数据分布不均，最大分区是最小分区的10倍',
        '存在空分区，建议清理以减少元数据开销',
        '分区数过多(>1000)，建议合并历史分区',
        '分区策略合理，存储利用率85%'
      ];
      return partitionResults[Math.floor(Math.random() * partitionResults.length)];
    }

    const results = resultsByType[analysisType] || ['分析完成，无异常发现'];
    return results[Math.floor(Math.random() * results.length)];
  }

  // 操作：启动任务
  startTask(task: AnalysisTask, execution?: TaskExecution): void {
    if (confirm(`确定要启动任务 "${task.taskName}" 吗？`)) {
      // 创建新的执行记录
      const newExecution: TaskExecution = {
        id: `exec_${task.id}_${String((task.executions?.length || 0) + 1).padStart(3, '0')}`,
        startTime: '-',
        endTime: '-',
        appId: '-',
        status: 'pending'
      };
      
      // 如果是基于已有执行记录启动，更新其状态
      if (execution) {
        execution.status = 'pending';
        execution.startTime = '-';
        execution.endTime = '-';
        execution.appId = '-';
      } else {
        // 否则添加新的执行记录
        if (!task.executions) {
          task.executions = [];
        }
        task.executions.unshift(newExecution); // 最新的在前
      }
      
      // 更新任务主状态
      task.status = 'pending';
      task.startTime = '-';
      task.endTime = '-';
      task.appId = '-';
      console.log('启动任务:', task.taskName);
    }
  }

  // 操作：停止任务
  stopTask(task: AnalysisTask, execution?: TaskExecution): void {
    if (confirm(`确定要停止任务 "${task.taskName}" 吗？`)) {
      const endTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      // 如果指定了执行记录，更新该记录
      if (execution) {
        execution.status = 'stopped';
        execution.endTime = endTime;
      }
      
      // 更新任务主状态（使用最新的执行记录）
      if (task.executions && task.executions.length > 0) {
        const latestExec = task.executions[0];
        latestExec.status = 'stopped';
        latestExec.endTime = endTime;
        task.status = 'stopped';
        task.endTime = endTime;
      } else {
        task.status = 'stopped';
        task.endTime = endTime;
      }
      
      console.log('停止任务:', task.taskName);
    }
  }

  // 操作：删除任务
  deleteTask(task: AnalysisTask): void {
    if (confirm(`确定要删除任务 "${task.taskName}" 吗？此操作不可恢复。`)) {
      const index = this.allTasks.findIndex(t => t.id === task.id);
      if (index > -1) {
        this.allTasks.splice(index, 1);
        this.filterTasks();
      }
      console.log('删除任务:', task.taskName);
    }
  }

  // 打开表列表弹窗
  openTablesModal(task: AnalysisTask, event: Event): void {
    event.stopPropagation();
    this.modalTaskName = task.taskName;
    this.modalTables = task.tables;
    this.showTablesModal = true;
  }

  // 关闭表列表弹窗
  closeTablesModal(): void {
    this.showTablesModal = false;
    this.modalTables = [];
    this.modalTaskName = '';
  }

  // 打开新增任务弹窗
  openCreateModal(): void {
    this.showCreateModal = true;
    this.resetCreateForm();
  }

  // 关闭新增任务弹窗
  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetCreateForm();
  }

  // 重置新增表单
  resetCreateForm(): void {
    this.newTaskName = '';
    this.analysisOptions.forEach(opt => opt.checked = false);
    this.partitionAnalysisEnabled = false;
    this.partitionAnalysisMode = 'recent_compaction';
    this.specifiedCommitTime = '';
    this.selectedDatabase = '';
    this.availableTables = [];
    this.selectedTables = [];
    this.tableSearchKeyword = '';
  }

  // 选择数据库
  onDatabaseChange(): void {
    this.availableTables = this.databaseTables[this.selectedDatabase] || [];
    this.selectedTables = [];
    this.tableSearchKeyword = '';
  }

  // 过滤后的表列表
  get filteredAvailableTables(): string[] {
    if (!this.tableSearchKeyword.trim()) {
      return this.availableTables;
    }
    const keyword = this.tableSearchKeyword.toLowerCase().trim();
    return this.availableTables.filter(table => 
      table.toLowerCase().includes(keyword)
    );
  }

  // 切换表选择
  toggleTableSelection(table: string): void {
    const index = this.selectedTables.indexOf(table);
    if (index > -1) {
      this.selectedTables.splice(index, 1);
    } else {
      this.selectedTables.push(table);
    }
  }

  // 全选/取消全选表
  toggleAllTables(): void {
    if (this.selectedTables.length === this.availableTables.length) {
      this.selectedTables = [];
    } else {
      this.selectedTables = [...this.availableTables];
    }
  }

  // 检查表是否被选中
  isTableSelected(table: string): boolean {
    return this.selectedTables.includes(table);
  }

  // 获取选中的分析项
  getSelectedAnalysis(): string[] {
    const selected = this.analysisOptions.filter(opt => opt.checked).map(opt => opt.label);
    if (this.partitionAnalysisEnabled) {
      if (this.partitionAnalysisMode === 'specified_commit') {
        selected.push(`分区存储分析(从指定commit时间扫描: ${this.specifiedCommitTime})`);
      } else {
        const modeLabel = this.partitionAnalysisModes.find(m => m.value === this.partitionAnalysisMode)?.label || '';
        selected.push(`分区存储分析(${modeLabel})`);
      }
    }
    return selected;
  }

  // 提交创建任务
  submitCreateTask(): void {
    const selectedAnalysis = this.getSelectedAnalysis();
    
    if (selectedAnalysis.length === 0) {
      alert('请至少选择一个分析项');
      return;
    }

    // 验证任务名
    if (!this.newTaskName || !this.newTaskName.trim()) {
      alert('请输入任务名称');
      return;
    }

    // 验证指定commit时间
    if (this.partitionAnalysisEnabled && this.partitionAnalysisMode === 'specified_commit') {
      if (!this.specifiedCommitTime) {
        alert('请输入commit时间戳');
        return;
      }
      if (!/^\d{17}$/.test(this.specifiedCommitTime)) {
        alert('commit时间戳格式错误，请输入17位数字（yyyyMMddHHmmssSSS）');
        return;
      }
    }
    
    if (!this.selectedDatabase) {
      alert('请选择数据库');
      return;
    }
    
    if (this.selectedTables.length === 0) {
      alert('请至少选择一张表');
      return;
    }

    // 创建新任务
    const newTask: AnalysisTask = {
      id: `task_${String(this.allTasks.length + 1).padStart(4, '0')}`,
      taskName: this.newTaskName.trim(),
      createTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      status: 'pending',
      tables: this.selectedTables.map(t => `${this.selectedDatabase}.${t}`),
      startTime: '-',
      endTime: '-',
      appId: '-',
      analysisTypes: selectedAnalysis,
      executions: [] // 新任务还没有执行记录
    };

    this.allTasks.unshift(newTask);
    this.filterTasks();
    this.closeCreateModal();
    
    alert(`任务创建成功！\n任务名: ${this.newTaskName.trim()}\n分析项: ${selectedAnalysis.join(', ')}\n分析表数: ${this.selectedTables.length}`);
  }

  // 判断是否可以查看报告
  canViewReport(task: AnalysisTask, execution?: TaskExecution): boolean {
    if (execution) {
      return execution.status === 'completed';
    }
    return task.status === 'completed';
  }

  // 判断执行记录是否可以启动
  canStartExecution(execution: TaskExecution): boolean {
    return execution.status === 'stopped' || execution.status === 'failed' || execution.status === 'completed';
  }

  // 判断执行记录是否可以停止
  canStopExecution(execution: TaskExecution): boolean {
    return execution.status === 'pending' || execution.status === 'running';
  }

  // 查看报告（基于执行记录）
  viewReportForExecution(task: AnalysisTask, execution: TaskExecution): void {
    // 临时设置任务状态为执行记录的状态，以便使用现有的 viewReport 方法
    const originalStatus = task.status;
    const originalAppId = task.appId;
    task.status = execution.status;
    task.appId = execution.appId;
    this.viewReport(task);
    task.status = originalStatus;
    task.appId = originalAppId;
  }

  // 判断是否可以启动
  canStart(task: AnalysisTask): boolean {
    return task.status === 'stopped' || task.status === 'failed' || task.status === 'completed';
  }

  // 判断是否可以停止
  canStop(task: AnalysisTask): boolean {
    return task.status === 'pending' || task.status === 'running';
  }

  // 判断是否可以删除
  canDelete(task: AnalysisTask): boolean {
    return task.status !== 'running';
  }

  // 切换任务行展开状态
  toggleTaskRow(task: AnalysisTask): void {
    if (this.expandedTaskId === task.id) {
      this.expandedTaskId = null;
    } else {
      this.expandedTaskId = task.id;
    }
  }

  // 判断任务行是否展开
  isTaskExpanded(task: AnalysisTask): boolean {
    return this.expandedTaskId === task.id;
  }
}
