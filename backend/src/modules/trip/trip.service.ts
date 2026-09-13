import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { AppException } from '../../common/errors/app.exception';
import { ERROR_CODES } from '../../constants/errors';
import { TripEntity } from './trip.entity';
import { CreateTripInput, MatchQuery, MatchedTrip } from './trip.types';

const GENDER_OPTIONS = ['不限', '男', '女'];
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
// 与 DECIMAL(10,2) 存储上限一致，超出即视为不合法
const BUDGET_MAX_VALUE = 99999999.99;
// 与存储列定义一致：destination VARCHAR(120)、transport VARCHAR(40)
const DESTINATION_MAX_LENGTH = 120;
const TRANSPORT_MAX_LENGTH = 40;

@Injectable()
export class TripService {
  constructor(@InjectRepository(TripEntity) private readonly trips: Repository<TripEntity>) {}

  create(input: CreateTripInput) {
    const data = this.validateCreate(input);
    return this.trips.save(this.trips.create(data));
  }

  list() {
    return this.trips.find({ order: { departDate: 'ASC', id: 'ASC' } });
  }

  async match(query: MatchQuery): Promise<MatchedTrip[]> {
    const q = this.validateMatchQuery(query);
    const candidates = await this.trips.find({
      where: {
        status: 'OPEN',
        destination: q.destination,
        departDate: Between(q.dateFrom, q.dateTo),
        budgetMin: LessThanOrEqual(q.budgetMax),
        budgetMax: MoreThanOrEqual(q.budgetMin)
      }
    });
    return candidates
      .map(trip => ({
        id: trip.id,
        destination: trip.destination,
        departDate: trip.departDate,
        days: trip.days,
        budgetMin: trip.budgetMin,
        budgetMax: trip.budgetMax,
        transport: trip.transport,
        companionCount: trip.companionCount,
        genderPreference: trip.genderPreference,
        score: this.score(trip, q)
      }))
      .sort((a, b) => b.score - a.score || a.departDate.localeCompare(b.departDate));
  }

  private fail(message: string): never {
    throw new AppException(ERROR_CODES.VALIDATION_FAILED, message);
  }

  private requireText(value: unknown, label: string, maxLength?: number): string {
    const text = String(value ?? '').trim();
    if (!text) this.fail(`${label}不能为空`);
    // 按码点计数字符数，与 MySQL VARCHAR(n) 的字符语义一致（emoji 等代理对算 1 个字符）
    if (maxLength !== undefined && [...text].length > maxLength) this.fail(`${label}长度超限，最长 ${maxLength} 个字符`);
    return text;
  }

  private requireDate(value: unknown, label: string): string {
    const text = this.requireText(value, label);
    const match = DATE_PATTERN.exec(text);
    if (!match) this.fail(`${label}格式不正确，应为 YYYY-MM-DD`);
    const [, year, month, day] = match.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      this.fail(`${label}不合法，该日期在日历上不存在`);
    }
    return text;
  }

  private requireInt(value: unknown, label: string, min: number, max: number): number {
    if (value === undefined || value === null || value === '') this.fail(`${label}不能为空`);
    const num = Number(value);
    if (!Number.isInteger(num) || num < min || num > max) this.fail(`${label}需为 ${min}-${max} 的整数`);
    return num;
  }

  private requireBudget(value: unknown, label: string): number {
    if (value === undefined || value === null || value === '') this.fail(`${label}不能为空`);
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0 || num > BUDGET_MAX_VALUE) this.fail(`${label}不合法，需在 0-${BUDGET_MAX_VALUE} 之间`);
    return num;
  }

  private validateCreate(input: CreateTripInput) {
    const destination = this.requireText(input.destination, '目的地', DESTINATION_MAX_LENGTH);
    const departDate = this.requireDate(input.departDate, '出发日期');
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (departDate < today) this.fail('出发日期不能早于今天');
    const days = this.requireInt(input.days, '行程天数', 1, 60);
    const budgetMin = this.requireBudget(input.budgetMin, '预算下限');
    const budgetMax = this.requireBudget(input.budgetMax, '预算上限');
    if (budgetMin > budgetMax) this.fail('预算下限不能高于预算上限');
    const transport = this.requireText(input.transport, '出行方式', TRANSPORT_MAX_LENGTH);
    const companionCount = this.requireInt(input.companionCount, '期望旅伴人数', 1, 20);
    const genderPreference = String(input.genderPreference ?? '不限').trim() || '不限';
    if (!GENDER_OPTIONS.includes(genderPreference)) this.fail(`性别偏好仅支持：${GENDER_OPTIONS.join('、')}`);
    return {
      ownerId: input.ownerId ?? 1,
      destination,
      departDate,
      days,
      budgetMin,
      budgetMax,
      transport,
      companionCount,
      genderPreference,
      status: 'OPEN'
    };
  }

  private validateMatchQuery(query: MatchQuery) {
    const destination = this.requireText(query.destination, '匹配条件中的目的地', DESTINATION_MAX_LENGTH);
    const dateFrom = this.requireDate(query.dateFrom, '出发日期起');
    const dateTo = this.requireDate(query.dateTo, '出发日期止');
    if (dateFrom > dateTo) this.fail('出发日期起不能晚于出发日期止');
    const budgetMin = this.requireBudget(query.budgetMin, '预算下限');
    const budgetMax = this.requireBudget(query.budgetMax, '预算上限');
    if (budgetMin > budgetMax) this.fail('预算下限不能高于预算上限');
    return { destination, dateFrom, dateTo, budgetMin, budgetMax };
  }

  private score(trip: TripEntity, q: { dateFrom: string; dateTo: string; budgetMin: number; budgetMax: number }): number {
    // 目的地已精确命中，固定权重 40
    const destinationScore = 40;
    // 出发日期越接近期望区间中点得分越高，权重 30
    const from = Date.parse(q.dateFrom);
    const to = Date.parse(q.dateTo);
    const half = Math.max((to - from) / 2, 1);
    const dateScore = 30 * Math.max(0, 1 - Math.abs(Date.parse(trip.departDate) - (from + to) / 2) / half);
    // 预算区间重合度（重合长度 / 并集长度），权重 30
    const overlap = Math.min(Number(trip.budgetMax), q.budgetMax) - Math.max(Number(trip.budgetMin), q.budgetMin);
    const union = Math.max(Number(trip.budgetMax), q.budgetMax) - Math.min(Number(trip.budgetMin), q.budgetMin);
    const budgetScore = union > 0 ? 30 * Math.max(0, overlap) / union : 30;
    return Math.round(destinationScore + dateScore + budgetScore);
  }
}
