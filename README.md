# Простой язык для описания и генерации диаграмм в HTML5-документе

[Project Wiki](https://se.cs.petrsu.ru/wiki/%D0%9F%D1%80%D0%BE%D1%81%D1%82%D0%BE%D0%B9_%D1%8F%D0%B7%D1%8B%D0%BA_%D0%B4%D0%BB%D1%8F_%D0%BE%D0%BF%D0%B8%D1%81%D0%B0%D0%BD%D0%B8%D1%8F_%D0%B8_%D0%B3%D0%B5%D0%BD%D0%B5%D1%80%D0%B0%D1%86%D0%B8%D0%B8_%D0%B4%D0%B8%D0%B0%D0%B3%D1%80%D0%B0%D0%BC%D0%BC_%D0%B2_HTML5-%D0%B4%D0%BE%D0%BA%D1%83%D0%BC%D0%B5%D0%BD%D1%82%D0%B5)

## Описание

В научно-технических текстах для иллюстрации абстрактных концепций применяются различные виды диаграмм: блок-схемы, графики, карты и др. Существует большое разнообразие программ для создания таких иллюстраций, в число которых входят как векторные редакторы общего назначения, так и специализированные инструменты для создания диаграмм конкретного типа. Однако, как правило, все они обладают одним существенным недостатком — отрисовка и позиционирование элементов диаграммы выполняется вручную с помощью мыши. В результате, при создании достаточно сложных диаграмм, бо́льшая часть времени тратится на выравнивание элементов по регулярной сетке.

Альтернативным подходом является применение декларативного языка для описания элементов диаграммы, связей между ними, а также способов их размещения на рисунке (относительно друг друга или в соответствии с некоторой сеткой). На основе полученного описания затем генерируется изображение.

Данный проект реализовывает вышеописанный подход на базе технологий HTML5. Он позволяет описывать внутри HTML-документа диаграммы, состоящие из заданных элементов этого документа.

Пользователю предоставляются следующие возможности:

1. Задание описания диаграммы в HTML документе и его интерпретация в момент отображения браузером
2. Определение блоков (прямоугольников, эллипсов) диаграммы со следующими параметрами:
  1. Позиция относительно другого блока: север, юг, запад, восток, северо-запад, северо-восток, юго-запад, юго-восток
  2. Выравнивание относительно другого блока
  3. Расстояние между блоками
  4. Текст внутри блока
3. Определение соединительных линий между блоками со следующими параметрами:
  1. Позиции начала и конца линии на блоках
  2. Внешний вид: толщина, стиль (сплошная, пунктир), форма стрелки начала и конца
  3. Текст подписи
  4. Позиция и направление текста подписи
 
Для интерпретации описания диаграммы необходимо подключить к HTML-документу JavaScript библиотеку и передать ей идентификатор описания. Она выполнит следующие шаги:

1. Определит размеры и абсолютные позиции блоков на изображении
2. Вычислит координаты точек соединительных линий между блоками
3. Установит CSS свойства для блоков, указывающие их позицию и размер
4. Создаст в документе объект Canvas, на котором нарисует соединительные линии
В результате пользователь сможет увидеть в браузере изображение диаграммы, соответствующее указанному описанию.

## Установка
1. В HTML5 документ, содержащий описание диаграммы необходимо подключить файлы библиотеки

        <script type="text/javascript" src="jquery-2.1.1.min.js"></script>
        <script type="text/javascript" src="dia.js"></script>

2. Вызвать функцию `dia.draw(id_объекта_с_описанием)` из пользовательского JavaScript (например, из обработчика события загрузки документа).

Для просмотра рекомендуем использовать:

* Chromium 42+,
* Firefox 37+
* Internet Explorer 11+

## Синтаксис описания диаграмм:
* Все объекты диаграммы описываются с помощью атрибутов тегов `div`
* Все значения атрибутов (включая идентификаторы) нечувствительны к регистру
* `div`'ы, описывающие элементы диаграммы, должны быть вложены в другой `div`, идентификатор которого передается функции `dia.draw`.

### Атрибуты и их значения
```xml
<!ELEMENT DIV (DIV+)>
<!-- Размер сетки, используемой вычислении соед. линий --> 
<!ATTLIST DIV dia-grid-size      %Pixels                                                        #IMPLIED "10">
<!-- Тип блока --> 
<!ATTLIST DIV dia-type           (RECTANGLE|ELLIPSE)                                            #IMPLIED "RECTANGLE">
<!-- Относительная позиция текущего блока --> 
<!ATTLIST DIV dia-pos            ID+(N|S|W|E|NW|NE|SW|SE)+%Pixels                               #REQUIRED>
<!-- Выравнивание этого блока относительно блока в 'dia-pos' --> 
<!ATTLIST DIV dia-align          (A1|A2|A3|B1|B2|B3|C1|C2|C3)                                   #IMPLIED "B2">
<!-- Минимальный размер или пропорции блока --> 
<!ATTLIST DIV dia-size           (%Pixels:%Pixels|NUMBER:NUMBER)                                #IMPLIED>
<!-- Координаты левого верхнего угла блока на изображении --> 
<!ATTLIST DIV dia-coords         %Pixels:%Pixels                                                #IMPLIED>
<!-- Позиция и внешний вид начала соед. линии --> 
<!ATTLIST DIV dia-line-start     ID+(N|S|W|E|NW|NE|SW|SE)+(TRIANGLE|CIRCLE|RHOMBUS|ANGLE|NONE)  #REQUIRED>
<!-- Позиция и внешний вид конца соед. линии --> 
<!ATTLIST DIV dia-line-end       ID+(N|S|W|E|NW|NE|SW|SE)+(TRIANGLE|CIRCLE|RHOMBUS|ANGLE|NONE)  #REQUIRED>
<!-- Направление подписи соед. линии --> 
<!ATTLIST DIV dia-text-direction (HOR|VER)                                                      #IMPLIED "HOR">
<!-- Позиция подписи соед. линии --> 
<!ATTLIST DIV dia-text-pos       (START|CENTER|END)                                             #IMPLIED "CENTER">
<!-- Внешний вид соед. линии --> 
<!ATTLIST DIV dia-line-style     %Pixels (SOLID|DOTTED|DASHED) %Color                           #IMPLIED>
```

#### Атрибуты объекта с описанием диаграммы
**dia-grid-size = %Pixels**  
*default: 10px*  
Размер сетки, используемой при вычислении соединительных линий. Уменьшение размера приводит к увеличению времени вычисления координат точек линий. При увеличение размера сетки, увеличивается минимальное расстояние между блоками (= 2 * размер сетки).

#### Атрибуты блоков
**dia-type = RECTANGLE | ELLIPSE**  
*default: RECTANGLE*  
Тип блока диаграммы:
* rectangle: блок-прямоугольник
* ellipse: блок-эллипс
 
**dia-pos = ID + (N | S | W | E | NW | NE | SW | SE) + %Pixels**  
Является обязательным атрибутом, если у этого блока не указана абсолютная позиция. Атрибут может быть не указан только у одного блока.  
Значение содержит три параметра:

1. *required* Идентификатор блока, относительно которого указывается позиция
2. *required* Позиция текущего блока относительно блока, указанного в первом значении. Возможные значения:
  * N (Север): сверху от
  * S (Юг): снизу от
  * W (Запад): слева от
  * E (Восток): справа от
  * NW (Северо-Запад): слева сверху от
  * NE (Северо-Восток): справа сверху от
  * SW (Юго-Запад): слева снизу от
  * SE (Юго-Восток): справа снизу от
3. _default: 2*dia-grid-size=20px_ Расстояние в пикселях относительно блока, указанного в первом аргументе

**dia-align = A1 | A2 | A3 | B1 | B2 | B3 | C1 | C2 | C3**  
*default: B2*
Выравнивание текущего блока относительно блока, указанного в первом значении атрибута dia-pos. Значение атрибута состоит из двух символов:

* буква задает точку на блоке, указанном в первом значении атрибута dia-pos
* цифра задает точку на текущем блоке.

<img src="/docs/align.png?raw=true" alt="posiible aligns" width="350px"/>

На созданном изображении указанные точки блоков будут находится на одном уровне.

**dia-size = %Pixels:%Pixels | NUMBER:NUMBER**  
Задет минимальный размер, если указаны "px". Если не указаны, то пропорции.

* Минимальный размер блока. Размер блока не может принимать значения меньше указанных. Значение атрибута состоит из двух чисел – длины и ширины.
* Пропорции блока. Значение атрибута состоит из двух чисел – соотношения длины блока к ширине.

**dia-coords = %Pixels:%Pixels**  
Позиция левого верхнего угла блока относительно левого верхнего изображения с диаграммой.


#### Атрибуты соединительных линий

**dia-line-start = ID + (N | S | W | E | NW | NE | SW | SE) + (TRIANGLE | CIRCLE | RHOMBUS | ANGLE | NONE)**  
**dia-line-end = ID + (N | S | W | E | NW | NE | SW | SE) + (TRIANGLE | CIRCLE | RHOMBUS | ANGLE | NONE)**  
*required*  
Значение атрибута содержит три параметра:

1. *required* Идентификатор блока начала (конца) соединительной линии
2. *required* Позиция начала (конца) соединительной линии на блоке, указанном в первом значении. Возможные значения:
  * N (Север): середина верхней стороны блока
  * S (Юг): середина нижней стороны блока
  * W (Запад): середина левой стороны блока
  * E (Восток): середина правой стороны блока
  * NW (Северо-запад): левый верхний угол блока
  * NE (Северо-восток): правый верхний угол блока
  * SW (Юго-запад): левый нижний угол блока
  * SE (Юго-восток): правый нижний угол блока
3. *default: NONE* Внешний вид начала или конца стрелки. Возможные значения:
  * angle: угловая скобка ("<", ">")
  * none: ничего
  * triangle: треугольник
  * circle: кружочек
  * rhombus: ромбик


**dia-direction = HOR | VER**  
*default: HOR*  
Направление подписи соединительной линии:

* hor: горизонтальное
* ver: вертикальное

**dia-text-pos = START | CENTER | END**  
*default: CENTER*  
Позиция подписи соединительной линии:

* start: в начале
* center: в середине
* end: в конце

**dia-line-style = %Pixels (SOLID | DOTTED | DASHED) %Color**  
*default: 1px SOLID BLACK*  
Значение атрибута описывает три параметра:

1. Толщина соединительной линии
2. Стиль линии. Возможные значения:
  * solid: сплошная
  * dotted: точечная
  * dashed: пунктирная
3. Цвет линии


## Примеры использования

*См. файл `index.html`*

```html
<div id="usecase">
    <!-- 
        У одного блока может быть не указана позиция (dia-pos), тогда относительная 
        позиция остальных блоков должна прямо или косвенно быть указан относительно этого блока
    -->
    <div id="bl1" class="block" dia-size="160px:160px">1</div>

    <!-- 
        dia-pos="bl1+n+150px" означает, что bl2 находится на серере (т.е. сверху) относительно 
        блока bl1 на расстоянии 150px
    -->
    <div id="bl2" dia-pos="bl1+n+150px" dia-size="160px:40px">2</div>
    <div id="bl3" dia-pos="bl1+e+150px" dia-size="40px:160px">3</div>
    
    <!--
    Описываем соединительную линию между блоками bl1 и bl2. 
    dia-line-start="bl1+n+rhombus" означает, что начало соед. линии находится на севере 
    (т.е. по центру сверху) на блоке bl1 и конец имеет форму ромбика. Аналогично для 
    dia-line-end. 
    Вертикальное направление подписи (Text 1-2) задается атрибутом dia-direction="ver" 
    -->
    <div dia-line-start="bl1+n+rhombus" 
            dia-line-end="bl2+s+angle" 
            dia-direction="ver" 
            dia-line-style="2px dotted red">Text 1-2</div>
            
    <div dia-line-start="bl1+e+circle" 
            dia-line-end="bl3+w+triangle" 
            dia-text-pos="start">Text 1-3 </div>
            
    <div dia-line-start="bl3+n" 
            dia-line-end="bl2+e+angle" 
            dia-text-pos="center" 
            dia-line-style="2px dashed blue"></div>
</div>

```

Если передать идентификатор этой диаграммы функции `dia.draw` в обработчике события загрузки документа, т.е.

```javascript
$(function() {
    dia.draw("usecase");
});
```
и установить CSS для блоков:

```css
.bl1, bl2, bl3 div {background: #aaa;}
```

то будет получено следующее изображение диаграммы:

<img src="/docs/example.png?raw=true" alt="Simple Usecase" width="300px"/>

## Нереализованные функции
- [ ] поддержка абсолютных позиций
- [ ] если блок эллипс, то соединительная линия не может начинаться из NW, NE, SE, SE
- [ ] если границы блока не попадают в узлы сетки, то соединительный линий могут смещены и не соприкасаться с блоком. (этого не случится, если позиции и размеры кратны размеру сетки)
- [ ] алгоритм определения координат соед. линий вычисляет не самые наглядные линии. Например, они могут проходить очень близко к другому блоку.
