import React, { useEffect, useState } from 'react';
import { Card, Table, Select, Input, Space, Button, Tag, Typography, message, Modal } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { aiJobsAPI } from '../api';

const { Title } = Typography;
const { Option } = Select;

const statusColor = {
  queued: 'gold',
  running: 'blue',
  succeeded: 'green',
  failed: 'red',
};

const statusText = {
  queued: '排队中',
  running: '运行中',
  succeeded: '成功',
  failed: '失败',
};

const AiTemplateJobs = () => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ status: undefined, keyword: '' });
  const [keywordInput, setKeywordInput] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState('');
  const [detailJson, setDetailJson] = useState('');

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await aiJobsAPI.getList({
        page: pagination.current,
        limit: pagination.pageSize,
        status: filters.status,
        keyword: filters.keyword || undefined,
      });
      setList(res?.data?.jobs || []);
      setPagination((prev) => ({
        ...prev,
        current: res?.data?.pagination?.page || prev.current,
        pageSize: res?.data?.pagination?.limit || prev.pageSize,
        total: res?.data?.pagination?.total || 0,
      }));
    } catch (error) {
      message.error('获取 AI 任务记录失败：' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [pagination.current, pagination.pageSize, filters.status, filters.keyword]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDetail = async (taskId) => {
    try {
      setDetailLoading(true);
      const res = await aiJobsAPI.getByTaskId(taskId);
      const raw = res?.data?.job?.result_json || '';
      let pretty = '';
      if (raw) {
        try {
          pretty = JSON.stringify(JSON.parse(raw), null, 2);
        } catch {
          pretty = raw;
        }
      }
      setDetailTaskId(taskId);
      setDetailJson(pretty || raw || '');
      setDetailVisible(true);
    } catch (error) {
      message.error('获取任务结果失败：' + (error.response?.data?.message || error.message));
    } finally {
      setDetailLoading(false);
    }
  };

  const downloadJson = () => {
    try {
      if (!detailJson) {
        message.warning('当前任务无 JSON 结果');
        return;
      }
      const blob = new Blob([detailJson], { type: 'application/json;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${detailTaskId || 'ai-task-result'}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('下载失败：' + (error.message || 'unknown'));
    }
  };

  const columns = [
    { title: '任务ID', dataIndex: 'task_id', key: 'task_id', width: 260, ellipsis: true },
    { title: '用户', dataIndex: 'username', key: 'username', render: (v) => v || '-' },
    { title: '画布', dataIndex: 'canvas_size', key: 'canvas_size', render: (v) => `${v || 32} x ${v || 32}` },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v) => <Tag color={statusColor[v] || 'default'}>{statusText[v] || v}</Tag>,
    },
    { title: '进度', dataIndex: 'progress', key: 'progress', render: (v) => `${Number(v) || 0}%` },
    { title: '进度说明', dataIndex: 'progress_text', key: 'progress_text', ellipsis: true },
    { title: '错误信息', dataIndex: 'error_message', key: 'error_message', ellipsis: true, render: (v) => v || '-' },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '结束时间',
      dataIndex: 'finished_at',
      key: 'finished_at',
      render: (v) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_UNUSED, record) => (
        <Space>
          <Button
            size="small"
            disabled={record.status !== 'succeeded'}
            onClick={() => openDetail(record.task_id)}
          >
            查看JSON
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>🤖 AI任务记录</Title>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Input
            placeholder="按任务ID或用户名搜索"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onPressEnter={() => {
              setPagination((prev) => ({ ...prev, current: 1 }));
              setFilters((prev) => ({ ...prev, keyword: keywordInput.trim() }));
            }}
            style={{ width: 280 }}
            prefix={<SearchOutlined />}
          />
          <Button
            type="primary"
            onClick={() => {
              setPagination((prev) => ({ ...prev, current: 1 }));
              setFilters((prev) => ({ ...prev, keyword: keywordInput.trim() }));
            }}
          >
            搜索
          </Button>
          <Select
            placeholder="状态"
            value={filters.status}
            onChange={(v) => {
              setPagination((prev) => ({ ...prev, current: 1 }));
              setFilters((prev) => ({ ...prev, status: v }));
            }}
            allowClear
            style={{ width: 150 }}
          >
            <Option value="queued">排队中</Option>
            <Option value="running">运行中</Option>
            <Option value="succeeded">成功</Option>
            <Option value="failed">失败</Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchList()}
          >
            刷新
          </Button>
        </Space>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={list}
          scroll={{ x: 1300 }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination((prev) => ({ ...prev, current: page, pageSize }));
            },
          }}
        />
      </Card>

      <Modal
        title={`任务结果 JSON：${detailTaskId}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={900}
        confirmLoading={detailLoading}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>关闭</Button>,
          <Button key="download" type="primary" onClick={downloadJson} disabled={!detailJson}>
            下载 JSON
          </Button>,
        ]}
      >
        <Input.TextArea
          value={detailJson || '当前任务暂无 JSON 结果'}
          autoSize={{ minRows: 16, maxRows: 22 }}
          readOnly
          style={{ fontFamily: 'Consolas, Menlo, monospace' }}
        />
      </Modal>
    </div>
  );
};

export default AiTemplateJobs;

