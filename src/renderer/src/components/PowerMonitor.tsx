import { useEffect, useState, useMemo, useRef } from 'react'
import { Table, Typography, Select, DatePicker, Space, Tag, message } from 'antd'
import dayjs from 'dayjs'

const { Title } = Typography
const { Option } = Select

const App: React.FC = () => {
  const [eventLog, setEventLog] = useState<Record<string, any[]>>({})
  const [filterType, setFilterType] = useState('全部')
  const [filterDate, setFilterDate] = useState(dayjs())
  const [status, setStatus] = useState<string | null>(null)

  const lastEventRef = useRef<any>(null)
  const initData = async () => {
    const data = await window.electron.ipcRenderer.invoke('read-log')
    const currentDate = dayjs().format('YYYY-MM-DD')
    const currentDateEvents = data[currentDate] || []

    setEventLog(data)
    lastEventRef.current = currentDateEvents[0]

    const currentStatus = await window.electron.ipcRenderer.invoke('get-power-status')
    setStatus(currentStatus)
  }

  useEffect(() => {
    initData()

    window.electron.ipcRenderer.on('power-status', (_, type) => {
      setStatus(type)

      const lastType = lastEventRef.current?.type

      // 取消重复事件的逻辑，所有事件都处理
      if (type === '来电' && lastType !== '来电') {
        addEvent('来电')
        message.success('💡 来电！')
      } else if (type === '断电' && lastType !== '断电') {
        addEvent('断电')
        message.error('⚡ 断电！')
      }
    })
  }, [])

  const addEvent = async (type: '来电' | '断电') => {
    const now = Date.now()
    const data = await window.electron.ipcRenderer.invoke('read-log')
    const currentDate = dayjs().format('YYYY-MM-DD')
    const currentDateEvents = data[currentDate] || []
    const newEvent = {
      key: `${now}_${Math.floor(Math.random() * 1000)}`,
      type,
      time: new Date().toLocaleString()
    }
    const updated = {
      ...eventLog,
      [currentDate]: [newEvent, ...currentDateEvents]
    }

    // 写入文件
    lastEventRef.current = newEvent
    await window.electron.ipcRenderer.invoke('write-log', updated)
    const newData = await window.electron.ipcRenderer.invoke('read-log')
    setEventLog(newData)
  }

  const filteredLog = useMemo(() => {
    const selectedDate = filterDate.format('YYYY-MM-DD')
    const data = eventLog[selectedDate] || []
    return data.filter((e) => filterType === '全部' || e.type === filterType)
  }, [eventLog, filterType, filterDate])

  const powerLossCount = filteredLog.filter((e) => e.type === '断电').length

  const columns = [
    {
      title: '事件',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color={type === '断电' ? 'red' : 'green'}>{type}</Tag>
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time'
    }
  ]

  return (
    <div style={{ padding: 20 }}>
      <Title level={2}>电力状态监控</Title>
      <p>
        当前状态:{' '}
        <strong style={{ color: status === '来电' ? 'green' : 'red' }}>
          {status || '加载中...'}
        </strong>
      </p>
      <p>
        🔌 当前筛选条件下断电次数: <strong>{powerLossCount}</strong>
      </p>

      <Space style={{ marginBottom: 16 }} wrap>
        <span>事件类型：</span>
        <Select value={filterType} onChange={setFilterType} style={{ width: 120 }}>
          <Option value="全部">全部</Option>
          <Option value="断电">断电</Option>
          <Option value="来电">来电</Option>
        </Select>

        <span>日期：</span>
        <DatePicker
          value={filterDate}
          onChange={(date) => setFilterDate(date || dayjs())}
          allowClear={false}
          format="YYYY-MM-DD"
        />
      </Space>

      <Table
        columns={columns}
        dataSource={filteredLog}
        pagination={{ pageSize: 10 }}
        rowKey="key"
      />
    </div>
  )
}

export default App
