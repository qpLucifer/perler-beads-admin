import React, { useEffect, useMemo, useState } from 'react';
import { Card, Button, Select, Input, Space, Typography, message, Table, Popconfirm } from 'antd';
import { legalAPI } from '../api';

const { Text } = Typography;
const { TextArea } = Input;

const DOC_OPTIONS = [
  { label: '用户协议', value: 'user_agreement' },
  { label: '隐私政策', value: 'privacy_policy' },
];

const LegalDocs = () => {
  const [docKey, setDocKey] = useState('user_agreement');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [version, setVersion] = useState('v1.0.0');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [versions, setVersions] = useState([]);
  const [rollingBackId, setRollingBackId] = useState(null);

  const docLabel = useMemo(
    () => DOC_OPTIONS.find((o) => o.value === docKey)?.label || docKey,
    [docKey]
  );

  const loadDoc = async (key = docKey) => {
    setLoading(true);
    try {
      const res = await legalAPI.getDoc(key);
      const doc = res?.data || {};
      setTitle(doc.title || '');
      setContent(doc.content || '');
      setVersion(doc.version || 'v1.0.0');
      setEffectiveDate(doc.effective_date || '');
      setUpdatedAt(doc.updated_at || '');
    } catch (error) {
      message.error(error?.response?.data?.message || '加载协议失败');
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (key = docKey) => {
    try {
      const res = await legalAPI.getVersions(key);
      setVersions(res?.data?.versions || []);
    } catch (error) {
      message.error(error?.response?.data?.message || '加载历史版本失败');
    }
  };

  useEffect(() => {
    loadDoc(docKey);
    loadVersions(docKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey]);

  const handleSave = async () => {
    if (!title.trim()) return message.warning('标题不能为空');
    if (!content.trim()) return message.warning('内容不能为空');
    setSaving(true);
    try {
      await legalAPI.updateDoc(docKey, {
        title: title.trim(),
        content: content.trim(),
        version: version.trim() || 'v1.0.0',
        effective_date: effectiveDate || null,
      });
      message.success('协议已发布');
      await loadDoc(docKey);
      await loadVersions(docKey);
    } catch (error) {
      message.error(error?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async (versionId) => {
    setRollingBackId(versionId);
    try {
      await legalAPI.rollback(docKey, versionId);
      message.success('已回滚到该版本');
      await loadDoc(docKey);
      await loadVersions(docKey);
    } catch (error) {
      message.error(error?.response?.data?.message || '回滚失败');
    } finally {
      setRollingBackId(null);
    }
  };

  const columns = [
    { title: '版本ID', dataIndex: 'id', width: 90 },
    { title: '版本号', dataIndex: 'version', width: 120, render: (v) => v || '-' },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '生效日期', dataIndex: 'effective_date', width: 140, render: (v) => v || '-' },
    { title: '创建时间', dataIndex: 'created_at', width: 180, render: (v) => v || '-' },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, row) => (
        <Popconfirm
          title="确认回滚到这个版本吗？"
          onConfirm={() => handleRollback(row.id)}
          okButtonProps={{ loading: rollingBackId === row.id }}
        >
          <Button size="small">回滚</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card title="协议管理" bordered={false}>
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        <Space wrap>
          <Text strong>协议类型</Text>
          <Select
            value={docKey}
            style={{ width: 220 }}
            options={DOC_OPTIONS}
            onChange={setDocKey}
            disabled={loading || saving}
          />
          <Button onClick={() => loadDoc(docKey)} loading={loading}>
            刷新
          </Button>
          <Button onClick={() => loadVersions(docKey)} disabled={saving || loading}>
            刷新历史
          </Button>
        </Space>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="请输入协议标题"
          addonBefore="标题"
          disabled={loading || saving}
        />

        <Space style={{ width: '100%' }} wrap>
          <Input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="例如 v1.0.0"
            addonBefore="版本号"
            style={{ width: 260 }}
            disabled={loading || saving}
          />
          <Input
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            placeholder="YYYY-MM-DD"
            addonBefore="生效日期"
            style={{ width: 260 }}
            disabled={loading || saving}
          />
          <Text type="secondary">最近更新：{updatedAt || '-'}</Text>
        </Space>

        <TextArea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={18}
          showCount
          placeholder={`编辑 ${docLabel} 内容，支持换行文本。`}
          disabled={loading || saving}
        />

        <Space>
          <Button type="primary" onClick={handleSave} loading={saving} disabled={loading}>
            保存并发布
          </Button>
          <Button onClick={() => loadDoc(docKey)} disabled={saving}>
            放弃修改
          </Button>
        </Space>

        <Card size="small" title="历史版本（最多 50 条）">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={versions}
            size="small"
            pagination={{ pageSize: 8 }}
          />
        </Card>
      </Space>
    </Card>
  );
};

export default LegalDocs;
