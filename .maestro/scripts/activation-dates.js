// Maestro runScript for the activation journey. Uses the clock of the machine
// running the browser, so the picked days match what the intake screens show.
// Training days: today and two more (0 = Sunday). Season start: 84 days
// (12 weeks) from today, as the season-day testID of that date.
var now = new Date()
var day = now.getDay()
output.today = day
output.day2 = (day + 2) % 7
output.day4 = (day + 4) % 7
var season = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 84)
var month = season.getMonth() + 1
var date = season.getDate()
output.seasonDay =
  'season-day-' +
  season.getFullYear() +
  '-' +
  (month < 10 ? '0' : '') +
  month +
  '-' +
  (date < 10 ? '0' : '') +
  date
