import moment from 'moment'

import { SECONDS_IN_YEAR } from '../config/constants'

export function getTTM(maturityTimestamp: number): number {
	const ts = moment.utc().unix()
	return (maturityTimestamp - ts) / SECONDS_IN_YEAR
}

export function getDaysToExpiration(maturity: string): number {
	const expirationMoment = moment.utc(maturity, 'DDMMMYY')

	// 1. check if option expiration is a valid date
	if (!expirationMoment.isValid()) {
		throw new Error(`Invalid expiration date: ${maturity}`)
	}

	const today = moment.utc().startOf('day')
	// NOTE: this returns a floor integer value for day (ie 1.9 days -> 1)
	return expirationMoment.diff(today, 'days')
}

export function createExpiration(maturity: string): number {
	const expirationMoment = moment.utc(maturity, 'DDMMMYY')

	// 1. check if option expiration is a valid date
	if (!expirationMoment.isValid()) {
		throw new Error(`Invalid expiration date: ${maturity}`)
	}

	// NOTE: this returns a floor integer value for day (ie 1.9 days -> 1)
	const daysToExpiration = getDaysToExpiration(maturity)

	// 2. DAILY and PAST OPTIONS: if option expiration is in the past, tomorrow, or the day after tomorrow, return as valid
	if (daysToExpiration <= 2) {
		// Set time to 8:00 AM
		return expirationMoment.add(8, 'hours').unix()
	}

	// 3. WEEKLY OPTIONS: check if option expiration is Friday
	//if (expirationMoment.day() !== 5) {
	//	throw new Error(`${expirationMoment.toJSON()} is not Friday!`)
	//}

	// 4. MONTHLY OPTIONS: if option maturity > 30 days, validate expire is last Friday of the month
	if (daysToExpiration > 30) {
		const lastDay = expirationMoment.clone().endOf('month').startOf('day')
		lastDay.subtract((lastDay.day() + 2) % 7, 'days')

		if (!lastDay.isSame(expirationMoment)) {
			throw new Error(
				`${expirationMoment.toJSON()} is not the last Friday of the month!`,
			)
		}
	}

	// Set time to 8:00 AM
	return expirationMoment.add(8, 'hours').unix()
}

export function getLast30Days(): moment.Moment[] {
	const days: moment.Moment[] = []
	const today = moment().startOf('day') // Start from the beginning of today

	for (let i = 0; i < 30; i++) {
		// Subtract 'i' days from today and add to the list
		days.push(today.clone().subtract(i, 'days'))
	}

	return days
}

export function nextYearOfMaturities() {
	const FRIDAY = 5
	const maturities = []

	const today = moment.utc().startOf('day')
	const nextYear = today.clone().add(1, 'year')

	const tomorrow = today.clone().add(1, 'day').add(8, 'hours')

	const afterTomorrow = today.clone().add(2, 'day').add(8, 'hours')

	const nextFriday = today.clone().day(FRIDAY).add(8, 'hours')

	maturities.push(tomorrow, afterTomorrow)

	if (
		!nextFriday.isSame(today, 'day') &&
		!nextFriday.isSame(tomorrow, 'day') &&
		!nextFriday.isSame(afterTomorrow, 'day')
	)
		maturities.push(nextFriday)

	if (moment.utc().day() === FRIDAY && moment.utc().hour() < 8)
		maturities.push(today)

	const next2ndFriday = nextFriday.clone().add(1, 'week')
	const next3rdFriday = nextFriday.clone().add(2, 'week')
	const next4thFriday = nextFriday.clone().add(3, 'week')

	maturities.push(next2ndFriday)

	if (next3rdFriday.diff(today, 'days') < 30) maturities.push(next3rdFriday)
	if (next4thFriday.diff(today, 'days') < 30) maturities.push(next4thFriday)

	let increment = 1
	let monthlyPointer = today.clone().startOf('month').add(increment, 'month')

	while (monthlyPointer.isBefore(nextYear, 'month')) {
		const lastDay = today
			.clone()
			.startOf('month')
			.add(increment, 'month')
			.endOf('month')
			.startOf('day')

		const lastFriday8AM = lastDay
			.subtract((lastDay.day() + 2) % 7, 'days')
			.add(8, 'hours')

		monthlyPointer = today.clone().startOf('month').add(increment, 'month')

		increment++
		maturities.push(lastFriday8AM)
	}

	return maturities
}
