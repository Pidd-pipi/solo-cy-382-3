import { Button, Card, Col, DatePicker, Form, Input, InputNumber, Layout, List, Row, Select, Statistic, Tabs } from 'antd';
import { EnvironmentOutlined, MessageOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const trips = [
  { destination: '大理', departDate: '2026-07-12', days: 5, budget: '3500-5200', transport: '公共交通', score: 96 },
  { destination: '青海湖', departDate: '2026-08-03', days: 7, budget: '4800-6800', transport: '自驾', score: 88 }
];

export default function App() {
  const [messages, setMessages] = useState(['系统：已进入大理行程协作空间']);
  const socket = useMemo(() => io('/', { path: '/socket.io' }), []);
  const send = () => {
    socket.emit('trip-message', { tripId: 1, sender: '我', content: '今晚确认民宿地址', type: 'text' });
    setMessages(items => [...items, '我：今晚确认民宿地址']);
  };
  return (
    <Layout className="shell">
      <Layout.Sider width={240} className="side"><h1>旅伴匹配</h1><p>TripMatch</p></Layout.Sider>
      <Layout.Content className="content">
        <Tabs items={[
          { key: 'publish', label: '发布行程', children: <Card><Form layout="vertical" className="form"><Form.Item label="目的地"><Input defaultValue="大理" /></Form.Item><Form.Item label="出发时间"><DatePicker /></Form.Item><Form.Item label="预算上限"><InputNumber defaultValue={5200} /></Form.Item><Form.Item label="出行方式"><Select defaultValue="公共交通" options={['自驾','公共交通','徒步'].map(v => ({ value: v }))} /></Form.Item><Button type="primary">发布计划</Button></Form></Card> },
          { key: 'match', label: '智能匹配', children: <Row gutter={16}>{trips.map(trip => <Col span={12} key={trip.destination}><Card title={<><EnvironmentOutlined /> {trip.destination}</>}><p>{trip.departDate} / {trip.days} 天 / {trip.transport}</p><Statistic title="匹配度" value={trip.score} suffix="%" /><Button>申请加入</Button></Card></Col>)}</Row> },
          { key: 'board', label: '协作看板', children: <Card title="每日安排"><List dataSource={['Day 1 抵达与集合','Day 2 环洱海','Day 3 沙溪古镇']} renderItem={item => <List.Item>{item}</List.Item>} /></Card> },
          { key: 'chat', label: '即时沟通', children: <Card title={<><MessageOutlined /> 行程群聊</>}><List dataSource={messages} renderItem={item => <List.Item>{item}</List.Item>} /><Button onClick={send}>发送示例消息</Button></Card> }
        ]} />
      </Layout.Content>
    </Layout>
  );
}
