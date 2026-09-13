import { FindOperator } from 'typeorm';
import { ERROR_CODES } from '../../constants/errors';
import { TripService } from './trip.service';
import { CreateTripInput } from './trip.types';

/** 内存版仓储：真实解释 TypeORM 查询操作符，让 match 的筛选条件参与断言 */
class FakeTripRepo {
  rows: any[] = [];

  create(input: any) {
    return { ...input };
  }

  async save(entity: any) {
    const row = { id: this.rows.length + 1, ...entity };
    this.rows.push(row);
    return row;
  }

  async find(options: any = {}) {
    let rows = [...this.rows];
    if (options.where) {
      rows = rows.filter(row =>
        Object.entries(options.where).every(([key, cond]) => this.matchCond(row[key], cond))
      );
    }
    if (options.order) {
      for (const [key, dir] of Object.entries(options.order).reverse() as [string, string][]) {
        rows.sort((a, b) => {
          const cmp = String(a[key]).localeCompare(String(b[key])) || (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0);
          return dir === 'DESC' ? -cmp : cmp;
        });
      }
    }
    return rows;
  }

  private matchCond(value: any, cond: any): boolean {
    if (cond instanceof FindOperator) {
      if (cond.type === 'between') {
        const [lo, hi] = cond.value as [any, any];
        return value >= lo && value <= hi;
      }
      if (cond.type === 'lessThanOrEqual') return value <= cond.value;
      if (cond.type === 'moreThanOrEqual') return value >= cond.value;
      throw new Error(`未支持的查询操作符: ${cond.type}`);
    }
    return value === cond;
  }
}

const futureDate = (daysAhead: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const validInput = (): Required<CreateTripInput> => ({
  ownerId: 1,
  destination: '大理',
  departDate: futureDate(30),
  days: 5,
  budgetMin: 3500,
  budgetMax: 5200,
  transport: '公共交通',
  companionCount: 2,
  genderPreference: '不限'
});

const makeService = () => {
  const repo = new FakeTripRepo();
  return { service: new TripService(repo as any), repo };
};

const expectReject = async (fn: () => Promise<unknown>, message: string) => {
  // create 的校验是同步抛错，包一层 Promise 转成 rejection 再断言
  await expect(Promise.resolve().then(fn)).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED, message });
};

describe('TripService 发布校验', () => {
  it('目的地为空时拒绝并提示目的地', async () => {
    const { service } = makeService();
    await expectReject(() => service.create({ ...validInput(), destination: '' }), '目的地不能为空');
    await expectReject(() => service.create({ ...validInput(), destination: '   ' }), '目的地不能为空');
  });

  it('目的地缺失时拒绝并提示目的地', async () => {
    const { service } = makeService();
    const input = validInput();
    delete (input as any).destination;
    await expectReject(() => service.create(input), '目的地不能为空');
  });

  it('出发日期格式错误时拒绝并提示出发日期', async () => {
    const { service } = makeService();
    await expectReject(() => service.create({ ...validInput(), departDate: '2026/10/01' }), '出发日期格式不正确，应为 YYYY-MM-DD');
    await expectReject(() => service.create({ ...validInput(), departDate: 'not-a-date' }), '出发日期格式不正确，应为 YYYY-MM-DD');
  });

  it('日历上不存在的日期拒绝并提示出发日期不合法', async () => {
    const { service } = makeService();
    await expectReject(() => service.create({ ...validInput(), departDate: '2026-11-31' }), '出发日期不合法，该日期在日历上不存在');
    await expectReject(() => service.create({ ...validInput(), departDate: '2026-04-31' }), '出发日期不合法，该日期在日历上不存在');
    await expectReject(() => service.create({ ...validInput(), departDate: '2026-02-29' }), '出发日期不合法，该日期在日历上不存在');
  });

  it('出发日期早于今天时拒绝', async () => {
    const { service } = makeService();
    await expectReject(() => service.create({ ...validInput(), departDate: '2020-01-01' }), '出发日期不能早于今天');
  });

  it('预算下限超范围时拒绝并提示预算下限', async () => {
    const { service } = makeService();
    await expectReject(() => service.create({ ...validInput(), budgetMin: 100000000 }), '预算下限不合法，需在 0-99999999.99 之间');
    await expectReject(() => service.create({ ...validInput(), budgetMin: -1 }), '预算下限不合法，需在 0-99999999.99 之间');
  });

  it('预算上限超范围时拒绝并提示预算上限', async () => {
    const { service } = makeService();
    await expectReject(() => service.create({ ...validInput(), budgetMax: 100000000 }), '预算上限不合法，需在 0-99999999.99 之间');
  });

  it('预算倒挂时拒绝并提示预算下限不能高于预算上限', async () => {
    const { service } = makeService();
    await expectReject(() => service.create({ ...validInput(), budgetMin: 8000, budgetMax: 3000 }), '预算下限不能高于预算上限');
  });

  it('行程天数越界时拒绝并提示行程天数', async () => {
    const { service } = makeService();
    await expectReject(() => service.create({ ...validInput(), days: 0 }), '行程天数需为 1-60 的整数');
    await expectReject(() => service.create({ ...validInput(), days: 61 }), '行程天数需为 1-60 的整数');
    await expectReject(() => service.create({ ...validInput(), days: 1.5 }), '行程天数需为 1-60 的整数');
  });

  it('期望旅伴人数越界时拒绝并提示期望旅伴人数', async () => {
    const { service } = makeService();
    await expectReject(() => service.create({ ...validInput(), companionCount: 0 }), '期望旅伴人数需为 1-20 的整数');
    await expectReject(() => service.create({ ...validInput(), companionCount: 21 }), '期望旅伴人数需为 1-20 的整数');
  });

  it('目的地长度超限时拒绝并提示目的地，等于上限照常保存', async () => {
    const { service } = makeService();
    await expectReject(() => service.create({ ...validInput(), destination: '丽'.repeat(121) }), '目的地长度超限，最长 120 个字符');
    const saved = await service.create({ ...validInput(), destination: '丽'.repeat(120) });
    expect([...saved.destination]).toHaveLength(120);
  });

  it('目的地按字符数计长，emoji 代理对算 1 个字符', async () => {
    const { service } = makeService();
    await expectReject(() => service.create({ ...validInput(), destination: '🌏'.repeat(121) }), '目的地长度超限，最长 120 个字符');
    const saved = await service.create({ ...validInput(), destination: '🌏'.repeat(120) });
    expect([...saved.destination]).toHaveLength(120);
  });

  it('出行方式长度超限时拒绝并提示出行方式，等于上限照常保存', async () => {
    const { service } = makeService();
    await expectReject(() => service.create({ ...validInput(), transport: '通'.repeat(41) }), '出行方式长度超限，最长 40 个字符');
    const saved = await service.create({ ...validInput(), transport: '通'.repeat(40) });
    expect([...saved.transport]).toHaveLength(40);
  });

  it('出行方式为空时拒绝并提示出行方式', async () => {
    const { service } = makeService();
    await expectReject(() => service.create({ ...validInput(), transport: '' }), '出行方式不能为空');
  });

  it('性别偏好非法时拒绝并提示性别偏好', async () => {
    const { service } = makeService();
    await expectReject(() => service.create({ ...validInput(), genderPreference: '保密' }), '性别偏好仅支持：不限、男、女');
  });

  it('校验失败时不落库', async () => {
    const { service, repo } = makeService();
    await expectReject(() => service.create({ ...validInput(), destination: '' }), '目的地不能为空');
    expect(repo.rows).toHaveLength(0);
  });
});

describe('TripService 发布正常路径', () => {
  it('合法行程成功发布并落库，性别偏好默认不限，状态 OPEN', async () => {
    const { service, repo } = makeService();
    const input = validInput();
    delete (input as any).genderPreference;
    const saved = await service.create(input);
    expect(saved).toMatchObject({
      id: 1,
      destination: '大理',
      departDate: input.departDate,
      days: 5,
      budgetMin: 3500,
      budgetMax: 5200,
      transport: '公共交通',
      companionCount: 2,
      genderPreference: '不限',
      status: 'OPEN'
    });
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({ id: saved.id, destination: '大理' });
  });

  it('发布成功后行程列表里能看到这条新行程', async () => {
    const { service } = makeService();
    const saved = await service.create(validInput());
    const list = await service.list();
    expect(list.map(t => t.id)).toContain(saved.id);
  });

  it('列表按出发日期升序返回', async () => {
    const { service, repo } = makeService();
    repo.rows.push(
      { id: 1, destination: '大理', departDate: '2026-12-01', status: 'OPEN' },
      { id: 2, destination: '大理', departDate: '2026-10-01', status: 'OPEN' },
      { id: 3, destination: '大理', departDate: '2026-11-01', status: 'OPEN' }
    );
    const list = await service.list();
    expect(list.map(t => t.departDate)).toEqual(['2026-10-01', '2026-11-01', '2026-12-01']);
  });

  it('发布成功后匹配结果里能看到这条新行程', async () => {
    const { service } = makeService();
    const saved = await service.create(validInput());
    const matches = await service.match({
      destination: '大理',
      dateFrom: '2026-01-01',
      dateTo: '2036-01-01',
      budgetMin: '1000',
      budgetMax: '9000'
    });
    expect(matches.map(m => m.id)).toContain(saved.id);
  });
});

describe('TripService 匹配筛选与打分', () => {
  const seed = (repo: FakeTripRepo) => {
    repo.rows.push(
      // 命中：日期正中、预算完全重合 -> 100 分
      { id: 1, destination: '大理', departDate: '2026-10-05', days: 5, budgetMin: 4000, budgetMax: 6000, transport: '公共交通', companionCount: 2, genderPreference: '不限', status: 'OPEN' },
      // 命中：日期偏离 2 天、预算重合 1/3 -> 65 分
      { id: 2, destination: '大理', departDate: '2026-10-03', days: 4, budgetMin: 3000, budgetMax: 5000, transport: '自驾', companionCount: 3, genderPreference: '不限', status: 'OPEN' },
      // 命中：日期偏离 2 天、预算重合 1/5 -> 61 分
      { id: 3, destination: '大理', departDate: '2026-10-07', days: 6, budgetMin: 5000, budgetMax: 9000, transport: '徒步', companionCount: 1, genderPreference: '女', status: 'OPEN' },
      // 排除：目的地不同
      { id: 4, destination: '丽江', departDate: '2026-10-05', days: 5, budgetMin: 4000, budgetMax: 6000, transport: '自驾', companionCount: 2, genderPreference: '不限', status: 'OPEN' },
      // 排除：出发日期在区间外
      { id: 5, destination: '大理', departDate: '2026-10-10', days: 5, budgetMin: 4000, budgetMax: 6000, transport: '自驾', companionCount: 2, genderPreference: '不限', status: 'OPEN' },
      // 排除：预算区间不重叠
      { id: 6, destination: '大理', departDate: '2026-10-05', days: 5, budgetMin: 7000, budgetMax: 8000, transport: '自驾', companionCount: 2, genderPreference: '不限', status: 'OPEN' },
      // 排除：已关闭
      { id: 7, destination: '大理', departDate: '2026-10-05', days: 5, budgetMin: 4000, budgetMax: 6000, transport: '自驾', companionCount: 2, genderPreference: '不限', status: 'CLOSED' }
    );
  };

  const query = { destination: '大理', dateFrom: '2026-10-01', dateTo: '2026-10-09', budgetMin: '4000', budgetMax: '6000' };

  it('按目的地、日期区间、预算区间和状态筛出候选', async () => {
    const { service, repo } = makeService();
    seed(repo);
    const matches = await service.match(query);
    expect(matches.map(m => m.id)).toEqual([1, 2, 3]);
  });

  it('匹配度计算正确并按从高到低排序', async () => {
    const { service, repo } = makeService();
    seed(repo);
    const matches = await service.match(query);
    expect(matches.map(m => m.score)).toEqual([100, 65, 61]);
    expect(matches.map(m => m.id)).toEqual([1, 2, 3]);
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
    }
  });

  it('无符合条件行程时返回空数组', async () => {
    const { service, repo } = makeService();
    seed(repo);
    const matches = await service.match({ ...query, destination: '香格里拉' });
    expect(matches).toEqual([]);
  });
});

describe('TripService 匹配条件校验', () => {
  it('目的地为空时拒绝并提示目的地', async () => {
    const { service } = makeService();
    await expectReject(
      () => service.match({ destination: '', dateFrom: '2026-10-01', dateTo: '2026-10-09', budgetMin: '1000', budgetMax: '6000' }),
      '匹配条件中的目的地不能为空'
    );
  });

  it('匹配目的地长度超限时拒绝并提示目的地', async () => {
    const { service } = makeService();
    await expectReject(
      () => service.match({ destination: '丽'.repeat(121), dateFrom: '2026-10-01', dateTo: '2026-10-09', budgetMin: '1000', budgetMax: '6000' }),
      '匹配条件中的目的地长度超限，最长 120 个字符'
    );
  });

  it('日历上不存在的日期拒绝并提示出发日期不合法', async () => {
    const { service } = makeService();
    await expectReject(
      () => service.match({ destination: '大理', dateFrom: '2026-11-31', dateTo: '2026-12-09', budgetMin: '1000', budgetMax: '6000' }),
      '出发日期起不合法，该日期在日历上不存在'
    );
    await expectReject(
      () => service.match({ destination: '大理', dateFrom: '2026-10-01', dateTo: '2026-04-31', budgetMin: '1000', budgetMax: '6000' }),
      '出发日期止不合法，该日期在日历上不存在'
    );
  });

  it('日期区间倒挂时拒绝', async () => {
    const { service } = makeService();
    await expectReject(
      () => service.match({ destination: '大理', dateFrom: '2026-10-09', dateTo: '2026-10-01', budgetMin: '1000', budgetMax: '6000' }),
      '出发日期起不能晚于出发日期止'
    );
  });

  it('预算上下限超范围时分别提示对应项不合法', async () => {
    const { service } = makeService();
    await expectReject(
      () => service.match({ destination: '大理', dateFrom: '2026-10-01', dateTo: '2026-10-09', budgetMin: '100000000', budgetMax: '200000000' }),
      '预算下限不合法，需在 0-99999999.99 之间'
    );
    await expectReject(
      () => service.match({ destination: '大理', dateFrom: '2026-10-01', dateTo: '2026-10-09', budgetMin: '1000', budgetMax: '100000000' }),
      '预算上限不合法，需在 0-99999999.99 之间'
    );
  });

  it('预算倒挂时拒绝', async () => {
    const { service } = makeService();
    await expectReject(
      () => service.match({ destination: '大理', dateFrom: '2026-10-01', dateTo: '2026-10-09', budgetMin: '8000', budgetMax: '3000' }),
      '预算下限不能高于预算上限'
    );
  });
});
