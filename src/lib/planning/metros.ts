// Metro areas the BEA cost-of-living lookup supports, by CBSA/GeoFips code —
// the value BEA's Regional dataset expects for `GeoFips`. Curated (the biggest
// US metros); an unlisted or wrong code fails safe to manual/national caps.
export interface Metro {
  fips: string;
  name: string;
}

export const METROS: Metro[] = [
  { fips: '35620', name: 'New York–Newark–Jersey City, NY-NJ-PA' },
  { fips: '31080', name: 'Los Angeles–Long Beach–Anaheim, CA' },
  { fips: '16980', name: 'Chicago–Naperville–Elgin, IL-IN-WI' },
  { fips: '19100', name: 'Dallas–Fort Worth–Arlington, TX' },
  { fips: '26420', name: 'Houston–The Woodlands–Sugar Land, TX' },
  { fips: '47900', name: 'Washington–Arlington–Alexandria, DC-VA-MD-WV' },
  { fips: '37980', name: 'Philadelphia–Camden–Wilmington, PA-NJ-DE-MD' },
  { fips: '33100', name: 'Miami–Fort Lauderdale–Pompano Beach, FL' },
  { fips: '12060', name: 'Atlanta–Sandy Springs–Alpharetta, GA' },
  { fips: '14460', name: 'Boston–Cambridge–Newton, MA-NH' },
  { fips: '38060', name: 'Phoenix–Mesa–Chandler, AZ' },
  { fips: '41860', name: 'San Francisco–Oakland–Berkeley, CA' },
  { fips: '42660', name: 'Seattle–Tacoma–Bellevue, WA' },
  { fips: '33460', name: 'Minneapolis–St. Paul–Bloomington, MN-WI' },
  { fips: '41740', name: 'San Diego–Chula Vista–Carlsbad, CA' },
  { fips: '19740', name: 'Denver–Aurora–Lakewood, CO' },
  { fips: '45300', name: 'Tampa–St. Petersburg–Clearwater, FL' },
  { fips: '12580', name: 'Baltimore–Columbia–Towson, MD' },
  { fips: '41180', name: 'St. Louis, MO-IL' },
  { fips: '16740', name: 'Charlotte–Concord–Gastonia, NC-SC' },
  { fips: '36740', name: 'Orlando–Kissimmee–Sanford, FL' },
  { fips: '38900', name: 'Portland–Vancouver–Hillsboro, OR-WA' },
  { fips: '40900', name: 'Sacramento–Roseville–Folsom, CA' },
  { fips: '29820', name: 'Las Vegas–Henderson–Paradise, NV' },
  { fips: '12420', name: 'Austin–Round Rock–Georgetown, TX' },
  { fips: '41700', name: 'San Antonio–New Braunfels, TX' },
  { fips: '38300', name: 'Pittsburgh, PA' },
  { fips: '17140', name: 'Cincinnati, OH-KY-IN' },
  { fips: '28140', name: 'Kansas City, MO-KS' },
  { fips: '18140', name: 'Columbus, OH' },
  { fips: '26900', name: 'Indianapolis–Carmel–Anderson, IN' },
  { fips: '17460', name: 'Cleveland–Elyria, OH' },
  { fips: '34980', name: 'Nashville–Davidson–Murfreesboro–Franklin, TN' },
];
