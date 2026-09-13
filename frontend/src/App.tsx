import { Button, Card, Col, DatePicker, Empty, Form, Input, InputNumber, Layout, List, Row, Select, Statistic, Tabs, Tag, message } from 'antd';
import { EnvironmentOutlined, MessageOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { api } from './api';

interface Trip {
  id: number;
  destination: string;
  departDate: string;
  days: number;
  budgetMin?: number;
  budgetMax?: number;
  transport: string;
  companionCount: number;
  genderPreference?: string;
  status?: string;
}

interface MatchedTrip extends Trip {
  score: number;
}

const TRANSPORT_OPTIONS = ['公共交通', '自驾', '徒步', '骑行'];
const GENDER_OPTIONS = ['不限', '男', '女'];

const budgetText = (trip: Trip) => `¥${trip.budgetMin ?? 0} - ¥${trip.budgetMax ?? 0}`;

export default function App() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [matches, setMatches] = useState<MatchedTrip[]>([]);
  const [searched, setSearched] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [activeTab, setActiveTab] = useState('publish');
  const [publishForm] = Form.useForm();
  const [matchForm] = Form.useForm();
  const [messages, setMessages] = useState(['系统：已进入大理行程协作空间']);
  const socket = useMemo(() => io('/', { path: '/socket.io' }), []);

  const loadTrips = useCallback(async () => {
    try {
      setTrips(await api<Trip[]>('/trips'));
    } catch (error) {
      message.error((error as Error).message);
    }
  }, []);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const publish = async (values: any) => {
    setPublishing(true);
    try {
      await api<Trip>('/trips', {
        method: 'POST',
        body: JSON.stringify({ ...values, departDate: values.departDate.format('YYYY-MM-DD') })
      });
      message.success('发布成功，行程列表与智能匹配中已可查看');
      publishForm.resetFields();
      await loadTrips();
      setActiveTab('list');
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  const runMatch = async (values: any) => {
    setMatching(true);
    try {
      const params = new URLSearchParams({
        destination: values.destination,
        dateFrom: values.dateRange[0].format('YYYY-MM-DD'),
        dateTo: values.dateRange[1].format('YYYY-MM-DD'),
        budgetMin: String(values.budgetMin),
        budgetMax: String(values.budgetMax)
      });
      setMatches(await api<MatchedTrip[]>(`/trips/match?${params}`));
      setSearched(true);
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setMatching(false);
    }
  };

  const send = () => {
    socket.emit('trip-message', { tripId: 1, sender: '我', content: '今晚确认民宿地址', type: 'text' });
    setMessages(items => [...items, '我：今晚确认民宿地址']);
  };

  const renderTripMeta = (trip: Trip) => (
    <p>{trip.departDate} 出发 / {trip.days} 天 / {trip.transport} / 预算 {budgetText(trip)} / 期望旅伴 {trip.companionCount} 人 / 性别偏好 {trip.genderPreference ?? '不限'}</p>
  );

  return (
    <Layout className="shell">
      <Layout.Sider width={240} className="side"><h1>旅伴匹配</h1><p>TripMatch</p></Layout.Sider>
      <Layout.Content className="content">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
          { key: 'publish', label: '发布行程', children: (
            <Card>
              <Form form={publishForm} layout="vertical" className="form" onFinish={publish} initialValues={{ transport: '公共交通', genderPreference: '不限', days: 3, companionCount: 2 }}>
                <Form.Item label="目的地" name="destination" rules={[{ required: true, message: '请填写目的地' }]}><Input placeholder="例如：大理" maxLength={120} showCount /></Form.Item>
                <Form.Item label="出发日期" name="departDate" rules={[{ required: true, message: '请选择出发日期' }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
                <Form.Item label="行程天数" name="days" rules={[{ required: true, message: '请填写行程天数' }]}><InputNumber min={1} max={60} style={{ width: '100%' }} /></Form.Item>
                <Form.Item label="预算下限（元）" name="budgetMin" rules={[{ required: true, message: '请填写预算下限' }]}><InputNumber min={0} max={99999999.99} style={{ width: '100%' }} /></Form.Item>
                <Form.Item label="预算上限（元）" name="budgetMax" rules={[{ required: true, message: '请填写预算上限' }]}><InputNumber min={0} max={99999999.99} style={{ width: '100%' }} /></Form.Item>
                <Form.Item label="出行方式" name="transport" rules={[{ required: true, message: '请选择出行方式' }]}><Select options={TRANSPORT_OPTIONS.map(v => ({ value: v }))} /></Form.Item>
                <Form.Item label="期望旅伴人数" name="companionCount" rules={[{ required: true, message: '请填写期望旅伴人数' }]}><InputNumber min={1} max={20} style={{ width: '100%' }} /></Form.Item>
                <Form.Item label="旅伴性别偏好" name="genderPreference"><Select options={GENDER_OPTIONS.map(v => ({ value: v }))} /></Form.Item>
                <Button type="primary" htmlType="submit" loading={publishing}>发布计划</Button>
              </Form>
            </Card>
          ) },
          { key: 'list', label: '行程列表', children: (
            <Card title={`全部行程（${trips.length}）`}>
              <List
                dataSource={trips}
                locale={{ emptyText: <Empty description="暂无行程，去发布第一条吧" /> }}
                renderItem={trip => (
                  <List.Item>
                    <List.Item.Meta
                      title={<><EnvironmentOutlined /> {trip.destination} <Tag color="green">{trip.status ?? 'OPEN'}</Tag></>}
                      description={renderTripMeta(trip)}
                    />
                  </List.Item>
                )}
              />
            </Card>
          ) },
          { key: 'match', label: '智能匹配', children: (
            <>
              <Card style={{ marginBottom: 16 }}>
                <Form form={matchForm} layout="inline" onFinish={runMatch}>
                  <Form.Item label="目的地" name="destination" rules={[{ required: true, message: '请填写目的地' }]}><Input placeholder="例如：大理" maxLength={120} showCount /></Form.Item>
                  <Form.Item label="出发日期区间" name="dateRange" rules={[{ required: true, message: '请选择出发日期区间' }]}><DatePicker.RangePicker /></Form.Item>
                  <Form.Item label="预算下限" name="budgetMin" rules={[{ required: true, message: '请填写预算下限' }]}><InputNumber min={0} max={99999999.99} /></Form.Item>
                  <Form.Item label="预算上限" name="budgetMax" rules={[{ required: true, message: '请填写预算上限' }]}><InputNumber min={0} max={99999999.99} /></Form.Item>
                  <Button type="primary" htmlType="submit" loading={matching}>开始匹配</Button>
                </Form>
              </Card>
              {matches.length === 0 && searched
                ? <Card><Empty description="没有符合条件的行程，换个日期或预算区间试试" /></Card>
                : (
                  <Row gutter={16}>
                    {matches.map(trip => (
                      <Col span={12} key={trip.id}>
                        <Card title={<><EnvironmentOutlined /> {trip.destination}</>} style={{ marginBottom: 16 }}>
                          {renderTripMeta(trip)}
                          <Statistic title="匹配度" value={trip.score} suffix="%" />
                          <Button>申请加入</Button>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
            </>
          ) },
          { key: 'board', label: '协作看板', children: <Card title="每日安排"><List dataSource={['Day 1 抵达与集合','Day 2 环洱海','Day 3 沙溪古镇']} renderItem={item => <List.Item>{item}</List.Item>} /></Card> },
          { key: 'chat', label: '即时沟通', children: <Card title={<><MessageOutlined /> 行程群聊</>}><List dataSource={messages} renderItem={item => <List.Item>{item}</List.Item>} /><Button onClick={send}>发送示例消息</Button></Card> }
        ]} />
      </Layout.Content>
    </Layout>
  );
}
