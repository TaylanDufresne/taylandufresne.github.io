
let chrInfo = []
let chromosome_number = 0;
let chromosomeNameList = []
let w;
let splitting
let testingWidthScale
let density_slider
let bars
let draggingSlider = false
let numberOfChromomsomes
let listOfGenes = []
let selectedInfo
let pairs = []

window.addEventListener('resize', () => {
    "use strict";
    window.location.reload();
})

function pullGeneInfo(collinearityFile){
    return d3.text(collinearityFile).then(function (data){
   
        let rawCollinearity = process(data);
        let selectedCollinearity = rawCollinearity.alignmentList.filter((d)=> d.source.indexOf('at') > -1 && d.target.indexOf('at') > -1)
        let genePairs = selectedCollinearity.reduce((c,e)=> {return [...c,...e.links]},[])
        let trueMatch = genePairs.filter((x) => +x.e_value == 0)
        return trueMatch
})}

// Turn into model
function pullInfo() {
    d3.text("at_coordinate.gff")
        .then(function (data) {
            temporary = data.split(/\n/)
            dataset = []
            dataset = temporary.map(function (d) {
                info = d.split('\t')
                var template = {
                    chromosome: info[0],
                    start: info[2],
                    end: info[3],
                    key: info[1]
                }
                return template
            });

            // Removing the last newline character
            trash = dataset.pop()

            // Clearing any leftover data
            chromosomeNameList.length = 0
            dataset.forEach((item) => {
                if (!chromosomeNameList.includes(item.chromosome)) {
                    chromosomeNameList.push(item.chromosome)
                    selection = chromosomeNameList[0]

                }
            })

            // Changing the default lexicographical order, since chromosome11 should come after chromosome2 
            chromosomeNameList.sort((a, b) => {
                return a.length - b.length || a.localeCompare(b)
            })

            // Clearing any leftover data
            chrInfo = []

            // Building an array of useful data/functions for each chromosome
            chromosomeNameList.forEach((chr) => {
                var subset = dataset.filter((d) => {
                    return d.chromosome == chr
                })

                var cap = Math.max.apply(Math, subset.map((d) => {
                    return d.end
                }))

                // TODO : get rid of this, it's not needed
                splitting = w / chromosomeNameList.length
                var scale = d3.scaleLinear().domain([0, cap]).range([chromosome_number * splitting, (chromosome_number + 1) * splitting])
                chromosome_number++;
                var reverseScale = d3.scaleLinear().domain([0, w]).range([0, cap])
                var temp = {
                    chromosome: chr,
                    data: subset,
                    cap: cap,
                    scaling: scale,
                    reverseScale: reverseScale
                }
                chrInfo.push(temp)
            })


            // Need max value for relative sizes of the chromosomes
            var max = 0;
            chrInfo.forEach((d) => {
                max += d.cap
            })

            testingWidthScale = d3.scaleLinear().domain([0, max]).range([0, w])

            for (i = 0; i < chrInfo.length; i++) {
                if (i == 0) {
                    chrInfo[i].beginning = 0
                    chrInfo[i].end = testingWidthScale(chrInfo[i].cap)
                }
                else {
                    chrInfo[i].beginning = chrInfo[i - 1].end
                    chrInfo[i].end = testingWidthScale(chrInfo[i].cap) + chrInfo[i].beginning
                }
                chrInfo[i].secondScale = d3.scaleLinear().domain([0, chrInfo[i].cap]).range([chrInfo[i].beginning, chrInfo[i].end])

            }


            colour = d3.scaleOrdinal().domain(chromosomeNameList)
                .range(["gold", "blue", "red", "green", "orange"])


            wScale = d3.scaleLinear()

            dragging = false

        })
}


class densityViewData {
    constructor(bars,max,chromosome){
        this.bars = bars
        this.max = max
        this.chromosome = chromosome
    }

    getBars(){
        return this.bars
    }

    getMax(){
        return this.max
    }
    getChromosome(){
        return this.chromosome
    }
}

class gene {

    // Draw method, contain method, recolor method?

    constructor(start, end, chromosome, key){
        this.start = start;
        this.end= end;
        this.chromosome = chromosome;
        this.key = key;
        this.hover = false;
        this.ortholog = false;
        this.siblings;



        let c, selectedHue
        let location = chromosomeNameList.findIndex((x) => { return x == this.chromosome })
        // if (location > numberOfChromomsomes) {
        //     location = location % numberOfChromomsomes
        // }
        selectedHue = (255 / numberOfChromomsomes) * (location)
        
        // TODO With this GDM, selection windows are constant, can use that to
        //locate  orthologous genes

        this.siblings = pairs.filter(e => e.source === key || e.target === key)
        
        this.ColourList = []
        if(this.siblings.length > 0){
            this.ortholog = true
            // console.log(this.siblings)
 
            this.siblings.forEach(sibling =>{
                let siblingSource = +sibling.source[2] - 1
                let siblingTarget = +sibling.target[2] - 1
                let siblingLocation = siblingSource
                if(siblingSource == location){
                    siblingLocation = siblingTarget
                }
                // console.log(location)
                // console.log(siblingLocation)
                if(siblingLocation == location){
                    selectedHue += 15
                    // console.log('same')
                    // console.log(selectedHue)
                }
                else{
                    // console.log('different')
                    selectedHue = (255 / numberOfChromomsomes) * (siblingLocation)
                }
                this.ColourList.push(color(selectedHue, 255, 200, 255))
            })

        }

        selectedHue = selectedHue % 255
        c = color(selectedHue, 255, 200, 255)
        this.color = c
        this.originalColor = c        
        
    }
    getStart(){
        return this.start
    }
    getEnd(){
        return this.end
    }
    getChromosome(){
        return this.chromosome
    }
    getKey(){
        return this.key
    }

    hovering(){
        if(mouseX > this.xScale(this.start) && mouseX < this.xScale(this.end)
        && mouseY > this.coordinateY && mouseY < this.coordinateY + 100){
            this.hover = true
            console.log(true)
            this.color = color(0, 0, 255, 255)        
            textSize(12)
            if(selectedInfo === undefined){
                console.log(this.ortholog)
                let divText = this.key
                if(this.ortholog){
                    divText += "<br/>Orthologs: " + this.siblings.length 
                    this.siblings.forEach(item=>{
                        if(item.source === this.key){
                            divText += "<br/>" + item.target 
                        }
                        else{
                            divText += "<br/>" + item.source
                        }
                    })
                }
                selectedInfo = createDiv(divText)
                selectedInfo.position(this.xScale(this.start), this.coordinateY+150)
                selectedInfo.style('color', 'white')
    
            }

            this.create(this.coordinateY, this.xScale, this.widthScale)
        }
        else if(this.hover == true){
            this.hover = false
            // removeItem(selectedInfo)
            if(selectedInfo != undefined){
                selectedInfo.remove()
                selectedInfo = undefined
            }
            
            this.color = this.originalColor
            this.create(this.coordinateY, this.xScale, this.widthScale)
        }

    }

    create(coordinateY, xScale, widthScale){
        this.coordinateY = coordinateY
        this.xScale = xScale
        this.widthScale = widthScale
        let size = this.end - this.start
        if(this.ColourList.length < 2){
            drawingContext.fillStyle = this.color
            // fill(this.color)
        }
        else{
            console.log("heres one")

            let x = xScale(this.start)
            let xx = x + widthScale(size)
            let y = this.coordinateY
            let yy = y + 100

            let gradient = drawingContext.createLinearGradient(x,y,xx,yy)
            this.ColourList.forEach((c,i)=>{
                console.log(c)
                gradient.addColorStop((i/(this.ColourList.length-1).toPrecision(2)), c)
            })
            // gradient.addColorStop(0, color(255, 100, 100, 100))
            // gradient.addColorStop(1, color(150, 100, 100, 100))
            drawingContext.fillStyle = gradient
            console.log(gradient)
            // background(gradient)
        }
        
        rect(xScale(this.start), this.coordinateY, widthScale(size), 100)
        
    }


}



class View {

    constructor(coordinateY, chosenDataset, max, chromosome) {
        this.coordinateY = coordinateY
        this.chosenDataset = chosenDataset
        this.selector = false
        // Can be in the controller
        this.dragging = false
        this.max = max
        this.chromosome = chromosome
        this.subscribers;
        this.averaging = true
        this.noScale = false
    }

    passBounds(start, end) {
        this.beginning = start
        this.end = end
    }

    getAveraging() {
        return this.averaging
    }
    updateSubscribers() {

        var selection = this.getSelectorSubset()
        this.subscribers.passBounds(selection[1], selection[2])

        if (this.subscribers.getAveraging()) {
            // var selection = this.getSelectorSubset()
            // console.log(selection)
            var newDensity = densityViewInfo(selection[0], selection[2], selection[1], bars)
            this.subscribers.updateDataset(newDensity.getBars(), newDensity.getMax())
        }
        else {
            
            this.subscribers.updateDataset(selection[0], 1)

        }

    }


    update() {
        
        numberOfChromomsomes = Math.min(chromosomeNameList.length, 6)

        // Averaging is a poor solution for this, should be tied to the slider
        if (this.averaging) {

            let brightnessScale = d3.scaleLinear().domain([0, this.max]).range([0,255])
            this.chosenDataset.forEach((d, i) => {

                colorMode(HSB, 255)
                let c, selectedHue, selectedBrightness;
                let location = chromosomeNameList.findIndex((x) => { return x == d.chromosome })
                if (location > numberOfChromomsomes) {
                    location = location % numberOfChromomsomes
                }
                selectedHue = (255 / numberOfChromomsomes) * (location)
                c = color(selectedHue, 255, 200, brightnessScale(d.number))
                fill(c)

                // This looks fine until zoom into the third level
                rect(i * w / this.chosenDataset.length, this.coordinateY, w / this.chosenDataset.length, 100)
            })


        }
        else {
            listOfGenes = []
            let xScale = d3.scaleLinear().range([0, w]).domain([this.beginning, this.end])
            let widthScale = d3.scaleLinear().range([0, w]).domain([0, this.end - this.beginning])
            // console.log(this.chosenDataset.length)
            this.chosenDataset.forEach((d) => {
                let testing = new gene(d.start,d.end,d.chromosome,d.key)
                // console.log(testing)
                testing.create(this.coordinateY,xScale,widthScale)
                listOfGenes.push(testing)
            })
        }

        if (this.selector) {
            fill(0, 0, 255, 75)
            // console.log(this.selectorX)
            rect(this.selectorX, this.coordinateY, this.selectorWidth, 100)
        }
        if(!this.noScale){
            this.drawScale()
        }
        else{
            this.lableChromosomes()
        }
        if (this.subscribers !== undefined) {
            this.updateSubscribers()
        }


    }

    removeScale(){
        this.noScale = true
    }
    
    lableChromosomes(){

        fill('white')
        textSize(18)
        chromosomeNameList.forEach((g,i)=>{
            let found = this.chosenDataset.findIndex((d) => {
                
               return d.chromosome == g
            })
            // console.log(found)
            
            text(g, found + 20, this.coordinateY - 5)
        })
        // console.log(chromosomeNameList)
        // console.log(chrInfo)
    }

    drawScale(){
        let start, end
        if(this.beginning !== undefined){
            start = this.beginning
            end = this.end
        }
        else{
            start = 0
            // I know this is wrong for at least one of the chromosomes
            end = this.chosenDataset[this.chosenDataset.length-1].end
        }
        
        let locationY = this.coordinateY + 107
        fill('white')
        textSize(12)
        rect(0, locationY, w, 3)
        locationY -= 3
        let increments = (w-3)/6
        let difference = (end - start)/ 6
        for(i = 0; i <= (w-3); i+= increments){
            rect(i, locationY, 3, 9)
            let value  = (typeof this.beginning === 'undefined' )? 0 : this.beginning
            // console.log(this.beginning)
            // console.log(value)
            if(i == 0){
                text(Math.round(value + i* difference), i + 5, locationY + 20)
            }
            
            else if(i <= (w-3)){
                text(Math.round(value + i* difference), i- 60, locationY + 20)  
            }
            // else{
            //   text(Math.round(value + i* difference), i, locationY + 20)  
            // }
            
            
        }
        
    }

    findSelection() {
        let g = mouseX / w * this.chosenDataset.length
        let p = Math.min(Math.round(g), this.chosenDataset.length)
        return this.chosenDataset[p].chromosome
    }

    addSelector(coordinateX, width) {
        this.selector = true
        this.selectorX = coordinateX
        this.selectorWidth = width
    }

    hit() {
        return this.selector && mouseX > this.selectorX && mouseX < this.selectorWidth + this.selectorX && mouseY > this.coordinateY && mouseY < this.coordinateY + 100
    }

    updateSelector(coordinateX) {
        this.selectorX = Math.min(Math.max(0, coordinateX - this.selectorWidth / 2), (w - this.selectorWidth))
    }

    setDragging(bool) {
        this.dragging = bool
    }
    dragged() {
        return this.dragging
    }
    checkSelector() {
        return this.selector
    }
    updateDataset(newInfo, max) {
        this.chosenDataset = newInfo
        this.max = max
    }
    withinBounds() {
        return mouseY > this.coordinateY && mouseY < this.coordinateY + 100 && mouseX > 0 && mouseX < w
    }

    getSelectorSubset() {
        // console.log(this.chosenDataset)

        let selectorScale = d3.scaleLinear().range([this.chosenDataset[0].start, this.chosenDataset[this.chosenDataset.length - 1].end]).domain([0, w])
        if (this.selector) {
            let chr = this.chosenDataset[0].chromosome
            let index = chrInfo.findIndex((d) => d.chromosome == chr)
            let beginning = selectorScale(this.selectorX)
            let end = selectorScale(this.selectorX + this.selectorWidth)
            let subset = chrInfo[index].data
            let thisIsWhatIwant = []
            for (let k = 0; k < subset.length; k++) {
                if ((subset[k].start >= beginning && subset[k].end <= end) || (subset[k].end >= beginning && subset[k].start <= beginning) || (subset[k].beginning <= end && subset[k].end >= end)) {
                    // console.log(subset[k].chromosome)
                    thisIsWhatIwant.push(subset[k])
                }
            }
            // console.log(end - beginning)
            return [thisIsWhatIwant, beginning, end]

        }
    }

    addSubscriber(sub) {
        this.subscribers = sub
    }

    noAverage() {
        this.averaging = false
    }

    pleaseAverage(){
        this.averaging = true
    }

    getChromosome(){
        return this.chromosome
    }


}

let first, second, third, fourth;
let built = false
pullInfo()
var viewList = []
pullGeneInfo("at_vv_collinear.collinearity").then(x =>(
    pairs = x
))

function process(collinearityData) {
    // The first 11 lines contain information regarding the MCSCANX Parameters
    // and can be processed seperately 
    var FileLines = collinearityData.split('\n'),
        information = parseInformation(FileLines.slice(0, 11)),
        alignmentList = [],
        alignmentBuffer = {};
    // remove the first 11 lines and then process the file line by line
    FileLines.slice(11).forEach(function(line, index) {
            if (line.indexOf('Alignment') > -1) {
                // store the previous alignment in list , 
                // and skip for the first iteration since buffer is empty
                if (alignmentBuffer.links) {
                    alignmentList.push(alignmentBuffer);
                }
                alignmentBuffer = parseAlignmentDetails(line);
                alignmentBuffer.links = [];
            } else if (line.trim().length > 1) {
                // condition to skip empty lines
                alignmentBuffer.links.push(parseLink(line));
            }
        })
        // push the last alignment still in the buffer
    alignmentList.push(alignmentBuffer);
    // get the unique list of IDs of all chromosomes or scaffolds that have alignments mapped to them
    let uniqueIDList = [];
    alignmentList.map((d) => { uniqueIDList.push(d.source, d.target) });
    return { "information": information, "alignmentList": alignmentList, 'uniqueIDList': uniqueIDList.filter(onlyUnique) };
};


function parseInformation(informationLines) {
    return {
        'parameters': [
            ['match score', informationLines[1].split(':')[1].trim()],
            ['match size', informationLines[2].split(':')[1].trim()],
            ['gap penality', informationLines[3].split(':')[1].trim()],
            ['overlap wndow', informationLines[4].split(':')[1].trim()],
            ['e value', informationLines[5].split(':')[1].trim()],
            ['maximum gaps', informationLines[6].split(':')[1].trim()]
        ],
        'stats': {
            'no_of_collinear_genes': informationLines[8].split(',')[0].split(":")[1].trim(),
            'percentage': Number(informationLines[8].split(',')[1].split(":")[1].trim()),
            'no_of_all_genes': informationLines[8].split(',')[1].split(":")[1].trim()
        }
    };
}

function parseAlignmentDetails(alignmentDetails) {
    let alignmentDetailsList = alignmentDetails.split(' ');
    return {
        'score': Number(alignmentDetailsList[3].split('=')[1].trim()),
        'e_value': Number(alignmentDetailsList[4].split('=')[1].trim()),
        'count': Number(alignmentDetailsList[5].split('=')[1].trim()),
        'type': alignmentDetailsList[7].trim() == 'plus' ? 'regular' : 'flipped',
        'source': alignmentDetailsList[6].split('&')[0].trim(),
        'target': alignmentDetailsList[6].split('&')[1].trim(),
        'sourceKey': Number(alignmentDetailsList[6].split('&')[0].trim().slice(2)),
        'targetKey': Number(alignmentDetailsList[6].split('&')[1].trim().slice(2)),
        'alignmentID': Number(alignmentDetailsList[2].split(':')[0].trim())
    };
}

function parseLink(link) {
    let linkInfo = link.split('\t');
    return {
        'source': linkInfo[1],
        'target': linkInfo[2],
        'e_value': linkInfo[3]
    };
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}


function setup() {
    w = $(document).width() - 30;
    h = $(document).height();
   
    createCanvas(w, h);
    background('#141414')
    // noLoop()
    // redraw()
    let title = createDiv("Gene Density Map")
    title.style('font-size', '24px')
    title.position(15,10)
    title.style('color', 'white')
    density_slider = createSlider(1, 50, 1, 1)
    density_slider.position(w * .05, 40)
    density_slider.style('width', (w * .9) + 'px')

    let search = createInput('Enter a gene')
    search.position(w * .05,60)
    search.size(200)

    let searchButton = createButton('Search')
    searchButton.position((w*.05)+200, 60)
    searchButton.size = 100

    let selectGenome = createSelect();
    selectGenome.position((w*.05) + 280, 60)
    selectGenome.option('Aradopsis')
    selectGenome.option('Brassica')
    selectGenome.option('Wheat')
}

function mouseReleased() {
    draggingSlider = false
    second.setDragging(false)
    third.setDragging(false)
}


function densityViewInfo(dataset, cap, start, density) {

    var densityView = []
    var distance = cap - start
    var increment = distance / density

    for (i = 1; i <= density; i++) {

        var temp = {
            start: start + increment * (i - 1),
            end: start + increment * i,
            number: 0,
            chromosome: dataset[0].chromosome
        }
        densityView.push(temp)
    }

    var max = 0;
    dataset.forEach((d) => {
        for (i = 0; i < densityView.length; i++) {
            // console.log('here')
            if (d.start > densityView[i].start && d.start < densityView[i].end) {
                densityView[i].number++;
                densityView[i].chromosome = d.chromosome
                if (densityView[i].number > max) {
                    max = densityView[i].number
                }
            }
        }
    })

    result = new densityViewData(densityView,max,dataset[0].chromosome)

    return result
}
function sliderChange(){
    if (mouseY < 50 || draggingSlider){
        draggingSlider = true
        return true
    }
}

function draw() {
    // fill(255,0,0)

    // console.log(density_zoom)
    bars = w / density_slider.value()
    // console.log(bars)
    listOfGenes.forEach((d)=> d.hovering())
    if (!built) {
        strokeWeight(0)
        var boxList = []
        var max = 0

        // console.log(chrInfo[0].cap)


        geneDensityScale = testingWidthScale.range([0, bars])

        for (x = 0; x < chrInfo.length; x++) {

            numberOfBars = geneDensityScale(chrInfo[x].cap)

            building = densityViewInfo(chrInfo[x].data, chrInfo[x].cap, 0, numberOfBars)

            if (building[1] > max) {
                max = building[1]
            }

            boxList.push(...building.getBars())

        }


        let beginning = densityViewInfo(chrInfo[0].data, chrInfo[0].cap, 0, bars)

        first = new View(150, boxList, 100, 'at')
        first.removeScale()

        second = new View(300, beginning.getBars(), beginning.getMax(), beginning.getChromosome())

        second.addSelector(20, 100)
        // need some logic around selector
        let oop = second.getSelectorSubset()
        let here = chrInfo.findIndex((d) => { return d.chromosome == oop[0][0].chromosome })

        let testing = densityViewInfo(chrInfo[here].data, oop[2], oop[1], bars)

        third = new View(450, testing.getBars(), testing.getMax(), testing.getChromosome())
        third.addSelector(20, 20)
        // third.noAverage()


        second.addSubscriber(third)
        let oopAgain = third.getSelectorSubset()
        let hereAgain = chrInfo.findIndex((d) => { return d.chromosome == oopAgain[0][0].chromosome })

        let testingAgain = densityViewInfo(oopAgain[0], oopAgain[2], oopAgain[1], bars)
        fourth = new View(600, testingAgain.getBars(), testingAgain.getMax(), testingAgain.getChromosome())
        fourth.noAverage()
        third.addSubscriber(fourth)

        built = true
        viewList.push(first, second, third, fourth)
        for (z = 0; z < viewList.length; z++) {
            viewList[z].update()
        }
    }

    if (mouseIsPressed) {
        
        if (built) {
            background('#141414')
            let altered = false
            // Hacky loop instead of subscribers atm

            if(sliderChange()){
                let choice = chromosomeNameList.findIndex((x) => { return x == second.getChromosome() })
                let information = chrInfo[choice]
                // console.log(information)
                bars =  w / density_slider.value()
                let thisCouldBeBetter = densityViewInfo(information.data, information.cap, information.beginning, bars)
                second.updateDataset(thisCouldBeBetter.getBars(), thisCouldBeBetter.getMax())
                // sliderChange = false
                if(density_slider.value() == 1){
                    third.noAverage()
                }
                else{
                    third.pleaseAverage()
                }
            }
            // console.log("here")
            for (z = 0; z < viewList.length; z++) {
                // if (!altered) {
                    // if(z == 1){
                    //     console.log(viewList[z].chosenDataset.length)
                    // }



                    if (viewList[z].checkSelector()) {
                        // console.log("Here: "+ z)
                        if (viewList[z].hit() || viewList[z].dragged()) {
                            viewList[z].updateSelector(mouseX)
                            viewList[z].setDragging(true)
                            altered = true
                        }
                    }
                    else {
                        if (viewList[z].withinBounds() && viewList[z].getAveraging()) {
                            console.log(z)
                            let selection = viewList[z].findSelection()
                            let index = chrInfo.findIndex((d) => { return d.chromosome == selection })
                            let newSet = densityViewInfo(chrInfo[index].data, chrInfo[index].cap, 0, bars)
                            viewList[z + 1].updateDataset(newSet.getBars(),newSet.getMax())
                            altered = true

                        }
                    }

                    viewList[z].update()
                // }
            }


        }



    }

}
