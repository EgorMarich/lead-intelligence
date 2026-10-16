import 'reflect-metadata';
import { AppDataSource } from './data-source';
import { CityEntity } from './entities/city.entity';
import { CategoryEntity } from './entities/category.entity';

async function seed() {
  await AppDataSource.initialize();
  const cities = AppDataSource.getRepository(CityEntity);
  const categories = AppDataSource.getRepository(CategoryEntity);

  const cityData = [
    ['Москва', 'RU', 'Москва', 'Europe/Moscow'],
    ['Санкт-Петербург', 'RU', 'Ленинградская область', 'Europe/Moscow'],
    ['Казань', 'RU', 'Татарстан', 'Europe/Moscow'],
    ['Екатеринбург', 'RU', 'Свердловская область', 'Asia/Yekaterinburg'],
    ['Новосибирск', 'RU', 'Новосибирская область', 'Asia/Novosibirsk'],
    ['Краснодар', 'RU', 'Краснодарский край', 'Europe/Moscow']
  ];
  for (const [name, countryCode, region, timezone] of cityData) {
    await cities.upsert({ name, countryCode, region, timezone }, ['name']);
  }

  const categoryData = [
    ['BARBERSHOP', 'Барбершоп'],
    ['BEAUTY_SALON', 'Салон красоты'],
    ['NAIL_SALON', 'Маникюрная студия'],
    ['MASSAGE', 'Массаж'],
    ['COSMETOLOGY', 'Косметология'],
    ['AUTO_SERVICE', 'Автосервис'],
    ['DETAILING', 'Детейлинг'],
    ['FITNESS', 'Фитнес']
  ];
  for (const [code, name] of categoryData) {
    await categories.upsert({ code, name }, ['code']);
  }

  await AppDataSource.destroy();
}
seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
