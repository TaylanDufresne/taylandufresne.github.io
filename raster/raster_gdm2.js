
let chosenCollinearityFile = "at_vv_collinear.collinearity"
let chosenGenomeFile = "at_coordinate.gff"
let w, h;
let genomeModel, controller;
let selectedInfo
let clearButton
let draggingSlider
let highlightOrthologs
let bars
let viewList = []
let first, second, third, fourth;
let overview;
let totalViews = 4
let overViewList
let constantHeight = 75;

class Controller {

    constructor() {

        // Booleans referencing state
        this.mousePressed = false
        this.built = false
        this.changed = false
        this.dragging = false
        this.resizing = false
        this.sliderChange = false
        this.updateOnce = false
        this.liveUpdate = true
        this.mouseIsPressed = false

        // Variables used for tooltips
        this.selectedInfo
        this.showingInfo = false
    }

    // Setters and getters
    setModel(model) {
        this.model = model
    }
    rebuild() {
        return !this.built
    }
    made(bool) {
        this.built = bool
    }
    modelChanged() {
        return this.changed
    }
    setModelChanged(bool) {
        this.changed = bool
    }
    getDragging() {
        return this.dragging
    }
    setDragging(bool) {
        this.dragging = bool
    }
    setResizing(bool) {
        this.resizing = bool
    }
    getSliderChange() {
        return this.sliderChange
    }
    setSliderChange(bool) {
        this.sliderChange = bool
    }
    setUpdateOnce(bool) {
        this.updateOnce = bool
    }
    getUpdateOnce() {
        return this.updateOnce
    }
    showingInfo() {
        return this.showingInfo
    }
}

class Model {

    constructor(dataset) {
        this.displayedGenes = []
        this.dataset = dataset

        this.chromosome = dataset[Object.keys(dataset)[0]]


        this.densityData = []
        this.chromosomeNameList = []
        this.viewList = []
        this.selectedGene;
        this.highlightOrthologs = false
        this.dragging = false
        this.subset = []
        this.subscribers = []

        // Scaffold information not comparable and clutters everything up
        let ignore = "Scaffold"
        for (let item in this.dataset) {
            // this.dataset.forEach((item) => {
            if (!this.chromosomeNameList.some((x) => x.chromosome == this.dataset[item].chromosome) && !this.dataset[item].chromosome.includes(ignore)) {

                var check = item

                var temp = {
                    chromosome: this.dataset[item].chromosome,
                    designation: check.slice(0, check.indexOf('g'))
                }
                // Building a list of the chromosome names, used for later finding information on that dataset
                this.chromosomeNameList.push(temp)
            }
        }
        // )
 
        // Changing the default lexicographical order, since chromosome11 should come after chromosome2 
        // additional logic so that all chromosomes from the same line should be grouped   
        this.chromosomeNameList.sort((a, b) => {
            if (a.chromosome[0].localeCompare(b.chromosome[0]) == 0) {
                return a.chromosome.length - b.chromosome.length
            }
            else {
                return a.chromosome[0].localeCompare(b.chromosome[0])
            }
        })

        // Building an array of useful data/functions for each chromosome
        this.chromosomalData = []
        this.chromosomeNameList.forEach((chr) => {
            var subset = Object.entries(this.dataset).filter(d=> {
                return d[1].chromosome == chr.chromosome
            }).map(x=> x[1])
            
            // var subset = dataset.filter((d) => {
            //     return d.chromosome == chr.chromosome
            // })

            var cap = Math.max.apply(Math, subset.map((d) => {
                return d.end
            }))

            var scale = d3.scaleLinear().domain([0, cap]).range([0, w])
            var reverseScale = d3.scaleLinear().domain([0, w]).range([0, cap])
            var temp = {
                key: chr,
                data: subset,
                cap: cap,
                scaling: scale,
                reverseScale: reverseScale
            }
            this.chromosomalData.push(temp)
        })

        // Need max value for relative sizes of the chromosomes
        var max = 0;
        this.chromosomalData.forEach((d) => {
            max += d.cap
        })

        // Scales for finding the locations of things
        this.overviewScale = d3.scaleLinear().domain([0, max]).range([0, w])
        this.reverseOverviewScale = d3.scaleLinear().domain([0, w]).range([0, Object.keys(this.dataset).length])

        for (var i = 0; i < this.chromosomalData.length; i++) {
            if (i == 0) {
                this.chromosomalData[i].start = 0
                this.chromosomalData[i].end = this.overviewScale(this.chromosomalData[i].cap)
            }
            else {
                this.chromosomalData[i].start = this.chromosomalData[i - 1].end
                this.chromosomalData[i].end = this.overviewScale(this.chromosomalData[i].cap) + this.chromosomalData[i].start
            }
        }

    }

    getChromosomeName() {
        return this.chromosome
    }

    toggleHighlightOrthologs() {
        this.highlightOrthologs = !this.highlightOrthologs
    }
    getHighlightOrthologs() {
        return this.highlightOrthologs
    }

    getDataset() {
        return this.dataset
    }
    getChromosomalData() {
        return this.chromosomalData
    }
    setOrthologs(pairs) {
        this.orthologs = pairs
        pairs.forEach((x => {
            let sourceIndex = x.source.toLowerCase()
            let targetIndex = x.target.toLowerCase()
            this.dataset[sourceIndex].ortholog = true
            this.dataset[targetIndex].ortholog = true
            this.dataset[sourceIndex].siblings.push(x.target)
            this.dataset[targetIndex].siblings.push(x.source)
        }))
    }
    getOrthologs() {
        return this.orthologs
    }
    getSelectedChromosome() {
        return this.chromosome
    }
    getSelectedChromosomeData() {
        return this.chromosomalData[this.index]
    }
    getAlternateChromosomeData(index) {
        return this.chromosomalData[index]
    }
    getStoredDensityData(index) {
        return this.densityData[index]
    }
    appendStoredDensityData(data) {
        this.densityData.push(data)
    }
    getSelectedSubsetData() {
        return this.subset
    }
    changeChromosome(chr) {
        this.chromosome = chr
    }
    getSelectedGene() {
        return this.selectedGene
    }
    setSelectedGene(gene) {
        this.selectedGene = gene
    }
    getChromosomeIndex(chromosome) {
        return this.chromosomeNameList.findIndex(x => {
            return x.chromosome == chromosome
        })
    }
    getNumberOfChromosomes() {
        return this.chromosomalData.length
    }
    getViewList() {
        return this.viewList
    }
    addToViewList(view) {
        this.viewList.push(view)
    }
    popViewList() {
        let trash = this.viewList.pop()
    }
    numberOfViews() {
        return this.viewList.length
    }
    updateSubscribers() {
        this.subscribers.forEach(subscriber => {
            subscriber.update()
        })
    }
    updateSingleView(index) {
        this.viewList[index].update()
    }
    searchForGene(query) {
        let index = query.toLowerCase()
        if (this.dataset[index] != undefined) {
            var queryInfo = this.dataset[index]
            var queryChromosomalData = this.chromosomalData[this.chromosomalData.findIndex((d) => { return d.key.chromosome == queryInfo.chromosome })]
            var querySubset = queryChromosomalData.data
            var queryCap = queryChromosomalData.cap

            // Gives index of gene on particular chromosome
            var subsetIndex = querySubset.findIndex((x, y) => {
                if (x.key == query) {
                    return true
                }
            })

            let geneLocation = {
                chromosome: queryInfo.chromosome,
                cap: queryCap,
                chromosomeData: querySubset,
                index: subsetIndex,
                key: query,
                start: this.dataset[index].start
            }
            return geneLocation
        }
        else {
            return -1
        }

    }

    alignSearch(geneLocation) {

        // Need to clear list or there is genes from prior to the search in the view
        let modifier = totalViews - 4
        this.clearDisplayedGenes()

        var searchView = densityViewInfo(geneLocation.chromosomeData, geneLocation.cap, 0, bars)
        this.viewList[1 + modifier].updateDataset(searchView.getBars(), searchView.getMax(),geneLocation.cap)

        let searchScale = d3.scaleLinear().domain([0, geneLocation.cap]).range([0, w])

        this.viewList[1 + modifier].updateSelector(searchScale(geneLocation.start))

        let subset = this.viewList[1 + modifier].getSelectorSubset()

        let anotherSearchScale = d3.scaleLinear().domain([subset.start, subset.end]).range([0, w])

        this.viewList[2 + modifier].updateSelector(anotherSearchScale(geneLocation.start))

    }

    pushToDisplayedGenes(gene) {
        this.displayedGenes.push(gene)
    }

    getDisplayedGenes() {
        return this.displayedGenes
    }
    clearDisplayedGenes() {
        this.displayedGenes.length = 0
    }
}

window.addEventListener('resize', () => {
    "use strict";
    window.location.reload();
})

// Pulls collinearity info and makes links
function pullGeneInfo(collinearityFile, nomenclature) {

    return d3.text(collinearityFile).then(function (data) {
        let rawCollinearity = process(data);
        let selectedCollinearity = []
        nomenclature.forEach(n => {
            let temporaryCollinearity = rawCollinearity.alignmentList.filter((d) => d.source.indexOf(n) > -1 && d.target.indexOf(n) > -1)
            selectedCollinearity.push(...temporaryCollinearity)
        })
        let genePairs = selectedCollinearity.reduce((c, e) => { return [...c, ...e.links] }, [])
        let trueMatch = genePairs.filter((x) => +x.e_value == 0)

        return trueMatch
    })
}

// Turns gff file into model
function pullInfo(genomeFile) {
    return d3.text(genomeFile)
        .then(function (data) {
            temporary = data.split(/\n/)
            // dataset = []
            savedDensityData = []

            let dataset = {}
            temporary.forEach(d=>{
                info = d.split('\t')
                // console.log(info)
                if (info.length > 1) {
                    let key = info[1].toLowerCase()
                    var stats = {
                        chromosome: info[0],
                        start: info[2],
                        end: info[3],
                        key: key,
                        ortholog: false,
                        siblings: [],
                    }
                    // console.log(stats)
                    // console.log(key)
                   dataset[key] = stats
            }
        })
            return dataset
        })
    }
           

// Used for drawing areas containing a number of genes vs each individual gene
class densityViewData {
    constructor(bars, max, chromosome) {
        this.bars = bars
        this.max = max
        this.chromosome = chromosome
    }
    getBars() {
        return this.bars
    }
    getMax() {
        return this.max
    }
    getChromosome() {
        return this.chromosome
    }
}

class gene {

    constructor(geneInfo, height) {
        // constructor(start, end, chromosome, key, height) {
        this.start = geneInfo.start;
        this.end = geneInfo.end;
        this.chromosome = geneInfo.chromosome;
        this.key = geneInfo.key;
        this.hover = false;
        this.ortholog = geneInfo.ortholog;
        this.height = height
        this.siblings = geneInfo.siblings;

        let c, selectedHue
        let location = genomeModel.getChromosomeIndex(this.chromosome)

        selectedHue = (255 / genomeModel.getNumberOfChromosomes()) * (location)

        // Using an array to track the respective colours of orthologous genes
        this.ColourList = []

        if (this.hasOrthologs()) {
            this.ortholog = true

            this.siblings.forEach(sibling => {

                let siblingSource;

                var sourceCheck = sibling.toLowerCase()


                var sourceDesignation = sourceCheck.slice(0, sourceCheck.indexOf('g'))

                siblingSource = genomeModel.chromosomeNameList.findIndex((d) => {
                    return d.designation == sourceDesignation
                })

                let siblingLocation = siblingSource

                if (siblingLocation == location) {
                    selectedHue += 10
                }
                else {
                    selectedHue = (255 / genomeModel.getNumberOfChromosomes()) * (siblingLocation)

                }

                this.ColourList.push(color(selectedHue, 255, 200, 255))
            })

        }

        c = color(selectedHue, 255, 200, 255)
        this.color = c
        this.originalColor = c

    }
    getStart() {
        return this.start
    }
    getEnd() {
        return this.end
    }
    getChromosome() {
        return this.chromosome
    }
    getKey() {
        return this.key
    }

    hovering() {
        if (mouseX > this.xScale(this.start) && mouseX < this.xScale(this.end)
            && mouseY > this.coordinateY && mouseY < this.coordinateY + constantHeight) {

            this.hover = true

            this.color = color(0, 0, 255, 255)
            textSize(12)
            if (selectedInfo === undefined) {

                let divText = this.key
                if (this.ortholog) {
                    divText += "<br/>Orthologs: " + this.siblings.length
                    this.siblings.forEach(item => {

                        divText += "<br/>" + item
                    })
                }
                selectedInfo = createDiv(divText)

                // TODO Running off the edges of the screen with this implementation
                selectedInfo.position(this.xScale(this.start), this.coordinateY + 150)
                selectedInfo.class("alert alert-dark")
            }
            this.create(this.coordinateY, this.xScale, this.widthScale)
        }
        else if (this.hover == true) {

            this.hover = false

            if (selectedInfo != undefined) {
                selectedInfo.remove()
                selectedInfo = undefined
            }

            this.color = this.originalColor
            this.create(this.coordinateY, this.xScale, this.widthScale)
        }

    }

    clicked() {
        return (mouseX > this.xScale(this.start) && mouseX < this.xScale(this.end)
            && mouseY > this.coordinateY && mouseY < this.coordinateY + constantHeight)
    }

    // TODO Passing xScale repeatedly this way is realllly not ideal, find an alternative
    create(coordinateY, xScale, widthScale) {
        this.coordinateY = coordinateY
        this.xScale = xScale
        this.widthScale = widthScale
        let size = this.end - this.start
        let x = xScale(this.start)
        let width = widthScale(size)
        let y = this.coordinateY
        let height = this.height
        if (this.ColourList.length < 2) {
            drawingContext.fillStyle = this.color

        }
        else {

            // Gradient implementation

            // let x = xScale(this.start)
            // let xx = x + widthScale(size)
            // let y = this.coordinateY
            // let yy = y + constantHeight
            // let gradient = drawingContext.createLinearGradient(x, y, xx, yy)
            // this.ColourList.forEach((c, i) => {

            //     gradient.addColorStop((i / (this.ColourList.length - 1).toPrecision(2)), c)
            // })

            // drawingContext.fillStyle = gradient


            // Multiple rectangles implementation

            if (this.hover) {
                drawingContext.fillStyle = color('white')
            }
            else {
                height = this.height / this.ColourList.length

                this.ColourList.forEach((c, i) => {
                    drawingContext.fillStyle = c
                    rect(x, y, width, height)
                    y += height
                })
                height = 0
            }
        }
        var selected = genomeModel.getSelectedGene()
        if (selected != undefined) {
            var isOrtholog = false
            if (selected.getOrthologs() != undefined && selected.getOrthologs().length > 0) {
                isOrtholog = selected.getOrthologs().some(x => x.toLowerCase() == this.key)
            }
            // Highlight white if an orthologous gene is selected as well
            if (selected.key == this.key || isOrtholog || this.hover) {
                drawingContext.fillStyle = color("white")
                y = this.coordinateY
                height = this.height
            }
        }

        rect(x, y, width, height)

    }
    hasOrthologs() {
        if (this.siblings != undefined) {
            return this.siblings.length > 0
        }
        else {
            return false
        }
    }

    getOrthologs() {
        return this.siblings
    }
}


class View {

    constructor(coordinateY, chosenDataset, max, chromosome, height) {
        this.coordinateY = coordinateY
        this.chosenDataset = chosenDataset
        this.selector = false
        // Can be in the controller
        this.dragging = false
        this.resizing = false
        this.max = max
        this.chromosome = chromosome
        this.subscribers;
        this.averaging = true
        this.noScale = false
        this.height = height
        this.borderList = []

        this.beginning = chosenDataset[0].start
        this.end = Math.max(...chosenDataset.map((d) => {
            return d.end
        }))
        this.selectable = false
        this.width = w
        this.coordinateX = 0

        this.selectorExtraHighlight = false
    }

    setAlternateWidth(width, coordinateX) {
        this.width = width
        this.coordinateX = coordinateX
    }

    passBounds(start, end) {
        this.beginning = start
        this.end = end
    }

    getAveraging() {
        return this.averaging
    }
    // TODO - This should almost certainly be in the model
    updateSubscribers() {

        var selection = this.getSelectorSubset()
        this.subscribers.passBounds(selection.start, selection.end)

        if (this.subscribers.getAveraging()) {
            var newDensity = densityViewInfo(selection.dataset, selection.end, selection.start, bars)
            if(newDensity != -1){
                this.subscribers.updateDataset(newDensity.getBars(), newDensity.getMax(),selection.end)
            }
            else{
                let hackyFix = {
                    start: selection.start,
                    end: selection.end,
                    number: 0,
                    chromosome: this.chromosome
                }
                this.subscribers.updateDataset([hackyFix], constantHeight,selection.end)
            }
            
        }
        else {

            this.subscribers.updateDataset(selection.dataset, 1, selection.end)
        }
    }

    showChromosome() {
        let chr = this.findSelection()
        display(chr)
    }

    update() {

        let numberOfChromomsomes = genomeModel.getNumberOfChromosomes()

        if (this.averaging) {
            let startOfChromosome, endOfChromosome
            let tracking = false
            let brightnessScale = d3.scaleLinear().domain([0, this.max]).range([0, 255])
            let currentChromosome;
            let locationScale = d3.scaleLinear().domain([0, this.chosenDataset.length - 1]).range([0, w])
            let orthologs = []
            let selected = genomeModel.selectedGene

            // If the view doesn't have a selector box, and it isn't drawing individual genes it is the overview
            // Saving the ortholog locations for markers
            if (!this.selector && selected != undefined && selected.hasOrthologs()) {

                genomeModel.selectedGene.getOrthologs().forEach(x => {
                    let target = genomeModel.searchForGene(x)
                    orthologs.push(target)
                })
            }

            // Logic for putting borders around each chromosome in the overview
            this.chosenDataset.forEach((d, i) => {

                if (!this.selector) {
                    if (currentChromosome == undefined) {
                        currentChromosome = d.chromosome
                    }
                    if (d.chromosome == currentChromosome && !tracking) {
                        tracking = true
                        startOfChromosome = locationScale(i)
                    }
                    if ((d.chromosome != currentChromosome && tracking) || (tracking && i == this.chosenDataset.length - 1)) {

                        tracking = false
                        endOfChromosome = locationScale(i + 1)

                        this.makeBorder(startOfChromosome, endOfChromosome, currentChromosome)
                        currentChromosome = d.chromosome
                        startOfChromosome = locationScale(i)

                        this.highlightBorder()
                    }

                    orthologs.forEach(x => {
                        if (x.start >= d.start && x.chromosome == d.chromosome && x.start <= d.end) {
                            fill(color('white'))
                            markerTriangle(locationScale(i), this.coordinateY + this.height)
                        }
                    })
                    if (selected != undefined) {
                        if (selected.start >= d.start && selected.chromosome == d.chromosome && selected.start <= d.end) {
                            fill(color('white'))
                            chosenTriangle(locationScale(i), this.coordinateY)
                        }
                    }
                }


                colorMode(HSB, 255);
                let c, selectedHue;
                let location = genomeModel.getChromosomeIndex(d.chromosome);

                selectedHue = (255 / numberOfChromomsomes) * (location);

                c = color(selectedHue, 255, 200, brightnessScale(d.number));

                fill(c);

                // TODO - find appropriate scales, location using this method is slightly off
                rect((i * this.width / this.chosenDataset.length) + this.coordinateX, this.coordinateY, this.width / this.chosenDataset.length, this.height)
            })




        }
        // Drawing individual genes
        else {

            let xScale = d3.scaleLinear().range([this.coordinateX, this.coordinateX + this.width]).domain([this.beginning, this.end])
            let widthScale = d3.scaleLinear().range([0, this.width]).domain([0, this.end - this.beginning])

            this.chosenDataset.forEach((d) => {
                let drawGene = new gene(d, this.height)

                drawGene.create(this.coordinateY, xScale, widthScale)

                if (this.selectable) {
                    genomeModel.pushToDisplayedGenes(drawGene)
                }
            })
        }


        if (this.selector) {
            this.refreshSelector()
        }
        if (!this.noScale) {
            this.drawScale()
        }
        if (this.subscribers !== undefined) {
            this.updateSubscribers()
        }


    }
    removeSelector() {
        if (this.selectorBox != undefined) {
            this.selectorBox.remove()
        }
        this.selector = false

    }
    removeHighlightBox() {
        if (this.highlightBox != undefined) {
            this.highlightBox.remove()
        }
    }
    updateHighlightBox(start, end) {
        if (this.highlightBox == undefined) {
            this.highlightBox = createDiv()
        }
        this.highlightBox.position(start, this.coordinateY)
        this.highlightBox.style('width', end - start + 'px')
        this.highlightBox.style('height', this.height + 'px')
        this.highlightBox.class('border border-light')

    }
    extraHighlight() {
        this.selectorExtraHighlight = true
    }
    makeBorder(start, end, chromosome) {
        let index = this.borderList.findIndex((d) => d.chromosome == chromosome)
        if (index < 0) {
            let borderBox = createDiv()
            borderBox.position(start, this.coordinateY)
            borderBox.style('width', end - start + 'px')
            borderBox.style('height', this.height + 'px')
            borderBox.class('border border-2 border-dark')

            let info = {
                chromosome: chromosome,
                border: borderBox
            }
            this.borderList.push(info)
        }
        else {
            this.borderList[index].border.position(start, this.coordinateY)
        }
    }
    highlightBorder() {
        let currentChromosome = genomeModel.getSelectedChromosome()
        this.borderList.forEach(b => {
            if (b.chromosome == currentChromosome) {
                b.border.class('border border-3 border-light')
            }
            else {
                b.border.class('border border-2 border-dark')
            }
        })
    }

    makeSelectable() {
        this.selectable = true
    }

    removeScale() {
        this.noScale = true
    }

    lableChromosomes() {
        fill('white')
        textSize(18)
        chromosomeNameList.forEach((g, i) => {
            let found = this.chosenDataset.findIndex((d) => {

                return d.chromosome == g
            })
            text(g, found + 20, this.coordinateY - 5)
        })
    }

    drawScale() {
        let start, end
        if (this.beginning !== undefined) {
            start = this.beginning
            end = this.end
        }
        else {
            start = 0
            end = this.end
        }

        let locationY = this.coordinateY + this.height + 7
        fill('white')
        textSize(12)
        rect(this.coordinateX, locationY, this.width, 3)
        locationY -= 3
        let increments = (this.width - 3) / 6
        let difference = (+end - start) / 6
        for (i = 0; i <= (this.width - 3); i += increments) {
            rect(i + this.coordinateX, locationY, 3, 9)
            let value = (typeof this.beginning === 'undefined') ? 0 : +this.beginning

            // TODO - Certain window sizes change the location of the scale, fix
            if (i == 0) {
                text(Math.round(value + i * difference), i + 5 + this.coordinateX, locationY + 20)
            }

            else if (i <= (this.width - 3)) {
                text(Math.round(value + i * difference), i - 60 + this.coordinateX, locationY + 20)
            }
        }

    }

    findSelection() {
        let g = mouseX / this.width * this.chosenDataset.length
        let p = Math.min(Math.round(g), this.chosenDataset.length)
        return this.chosenDataset[p].chromosome
    }

    addSelector(coordinateX, width) {
        this.selector = true
        this.selectorX = coordinateX
        this.selectorWidth = width
        if (this.highlightBox != undefined) {
            this.highlightBox.remove()
            this.highlightBox = undefined
        }
    }
    refreshSelector() {

        if (this.selectorBox != undefined) {
            // Move it here
            if (this.dragging) {
                this.selectorBox.position(this.selectorX, this.coordinateY)
            }
            else if (this.resizing) {
                this.selectorBox.style('width', this.selectorWidth + 'px')
                this.selectorBox.style('height', this.height + 'px')
            }
        }
        else {
            // Make a new selector box
            let newSelector = createDiv()
            newSelector.style('width', this.selectorWidth + 'px')
            newSelector.style('height', this.height + 'px')
            newSelector.class("border border-light")
            newSelector.mouseOver(() => {
                newSelector.class("border border-primary bg-light opacity-25")

            })
            newSelector.mouseMoved(() => {
                if (mouseX < this.selectorX + 3 || mouseX > this.selectorX + this.selectorWidth - 3) {
                    newSelector.style('cursor: w-resize')
                }
                else {
                    newSelector.style('cursor: pointer')
                }
            })
            newSelector.mouseOut(() => {
                if (!this.dragging) {
                    newSelector.class("border border-light")
                }
            })
            newSelector.mousePressed(() => {
                if (this.hit()) {
                    if (mouseX < this.selectorX + 3 || mouseX > this.selectorX + this.selectorWidth - 3) {
                        if (mouseX < this.selectorX + 3) {
                            this.west = true
                        }
                        else {
                            this.west = false
                        }
                        this.resizing = true
                    }
                    else {
                        this.dragging = true
                    }
                }
            })
            newSelector.mouseReleased(() => {
                this.dragging = false
                this.resizing = false
            })
            newSelector.position(this.selectorX, this.coordinateY)

            this.selectorBox = newSelector
        }
    }

    hit() {
        return this.selector && mouseX > this.selectorX && mouseX < this.selectorWidth + this.selectorX && mouseY > this.coordinateY && mouseY < this.coordinateY + this.height
    }

    updateSelector(coordinateX) {

        if (!this.resizing) {
            this.selectorX = Math.min(Math.max(0, coordinateX - this.selectorWidth / 2), (this.width - this.selectorWidth))
            this.selectorBox.position(this.selectorX, this.coordinateY)
        }
        else {
            let delta;
            if (this.west) {
                delta = coordinateX - this.selectorX
                if ((this.selectorWidth + delta < 15) || coordinateX > this.selectorX + this.selectorWidth) {

                }
                else {
                    this.selectorX += delta
                    this.selectorWidth -= delta
                }

            }
            else {
                delta = coordinateX - (this.selectorX + this.selectorWidth)
                if ((this.selectorWidth + delta < 15) || coordinateX < this.selectorX) {
                }
                else {
                    this.selectorWidth += delta
                }

            }

            this.selectorBox.position(this.selectorX, this.coordinateY)
        }
        this.refreshSelector()
    }

    setDragging(bool) {
        this.dragging = bool
    }
    dragged() {
        return this.dragging
    }
    resized() {
        return this.resizing
    }
    checkSelector() {
        return this.selector
    }
    updateDataset(newInfo, max, end) {
        if (newInfo[0] !== undefined) {
            this.chromosome = newInfo[0].chromosome
        }

        this.chosenDataset = newInfo
        this.max = max
        // TODO - Leads to fucked up scale, needed for aligning search
        // this.end = Math.max.apply(Math, newInfo.map((d) => {
        //     return d.end
        // }))
        this.end = end
    }
    withinBounds() {
        return mouseY > this.coordinateY && mouseY < this.coordinateY + this.height && mouseX > this.coordinateX && mouseX < this.width + this.coordinateX
    }

    getSelectorSubset() {
        // TODO this is likely in the wrong class for this functionality
        
        let selectorScale = d3.scaleLinear().range([this.beginning, this.end]).domain([0, w])
        if (this.selector) {
            let chr = this.chromosome
            let index = genomeModel.getChromosomeIndex(chr)
            let beginning = selectorScale(this.selectorX)
            let end = selectorScale(this.selectorX + this.selectorWidth)
            let subset = genomeModel.getAlternateChromosomeData(index).data
            let finalSubset = []
            for (let k = 0; k < subset.length; k++) {
                if ((subset[k].start >= beginning && subset[k].end <= end) || (subset[k].end >= beginning && subset[k].start <= beginning) || (subset[k].start <= end && subset[k].end >= end)) {
                    finalSubset.push(subset[k])
                }
            }
            let values = {
                dataset: finalSubset,
                start: beginning,
                end: end
            }
            return values
        }
    }

    addSubscriber(sub) {
        this.subscribers = sub
    }

    noAverage() {
        this.averaging = false
    }

    pleaseAverage() {
        this.averaging = true
    }

    getChromosome() {
        return this.chromosome
    }
}

function process(collinearityData) {
    // The first 11 lines contain information regarding the MCSCANX Parameters
    // and can be processed seperately 
    var FileLines = collinearityData.split('\n'),
        information = parseInformation(FileLines.slice(0, 11)),
        alignmentList = [],
        alignmentBuffer = {};
    // remove the first 11 lines and then process the file line by line
    FileLines.slice(11).forEach(function (line, index) {
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

// TODO Dont let run off the screen
// Displays tooltip
function display(text) {
    if (selectedInfo === undefined) {

        selectedInfo = createDiv(text)

        selectedInfo.position(mouseX, mouseY + 20)
        selectedInfo.class("alert alert-dark")

    }
    else {
        selectedInfo.remove()
        selectedInfo = createDiv(text)
        selectedInfo.position(mouseX, mouseY + 20)
        selectedInfo.class("alert alert-dark")
    }
}




function mouseReleased() {
    draggingSlider = false
    controller.setSliderChange(false)
    second.setDragging(false)
    third.setDragging(false)
    if (!controller.liveUpdate) {
        controller.updateOnce = true
        genomeModel.clearDisplayedGenes()
    }

    controller.changed = false
    controller.setDragging(false)
    controller.setResizing(false)

    // Hacky fix
    viewList.forEach(v => {
        if (v.checkSelector()) {
            v.dragging = false
            v.resizing = false
        }
    })
}

function mousePressed() {
    if (controller.liveUpdate) {
        controller.changed = true
    }
}

function changeGenome() {
    let spinner = createDiv()
    spinner.class("spinner-grow text-primary")
    spinner.position((w * .05) + 290, 90)
    let choice = selectGenome.value()

    switch (choice) {
        case "Arabidopsis": {
            chosenCollinearityFile = "at_vv_collinear.collinearity"
            chosenGenomeFile = "at_coordinate.gff"
            nomenclature = ['at']
            break
        }
        case "Brassica Napus": {
            chosenCollinearityFile = "bn_collinear.collinearity"
            chosenGenomeFile = "bn_coordinate.gff"
            nomenclature = ['bn']
            break
        }
        case "Canola Comparison": {
            chosenCollinearityFile = "canola.collinearity"
            chosenGenomeFile = "canola.gff"
            nomenclature = ['N', 'DN']
            break
        }
    }

    // TODO hacky fix for removing overview borders
    let numberOfBordersToRemove = totalViews - 4
    for (i = 0; i <= numberOfBordersToRemove; i++) {
        viewList[i].borderList.forEach(d => d.border.remove())
    }

    genomeModel.clearDisplayedGenes()
    pullInfo(chosenGenomeFile).then(dataset => {
        genomeModel = new Model(dataset)
        if (dataset.length > 900000) {
            controller.liveUpdate = false
        }
    }).then(() => {
        pullGeneInfo(chosenCollinearityFile, nomenclature).then(pairs => {
            genomeModel.setOrthologs(pairs)
            controller.built = false
            spinner.remove()
        })
    })
}

// Function for consolidating multiple genes into a block, used to pass information to the view
function densityViewInfo(dataset, cap, start, density) {

    var densityView = []
    var distance = cap - start
    var increment = distance / density
    var result

    if (dataset.length > 0) {
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

        densityView.forEach(x => {
            x.number = dataset.filter(e => e.end >= x.start && e.start <= x.end).length
            max = Math.max(max, x.number)
        })

        result = new densityViewData(densityView, max, dataset[0].chromosome)
    }
    else {
        result = -1
    }
    return result
}

// Function for determining if the user has interacted with the slider - using for live updating
function sliderChange() {
    if (mouseY < 60 || controller.getSliderChange()) {
        controller.setUpdateOnce(true)
        return true
    }
}

function changedHighlight() {

    genomeModel.toggleHighlightOrthologs()
    controller.setUpdateOnce(true)
}

function markerTriangle(centerX, coordinateY) {
    triangle(centerX - 3, coordinateY + 10, centerX, coordinateY, centerX + 3, coordinateY + 10)
}

function chosenTriangle(centerX, coordinateY) {
    triangle(centerX - 3, coordinateY - 10, centerX, coordinateY, centerX + 3, coordinateY - 10)
}

function searchButtonClicked() {
    let query = document.getElementById('search').value
    if (query != undefined && query != '') {
        let found = genomeModel.searchForGene(query)
        if (found != -1) {
            genomeModel.alignSearch(found)
            controller.setUpdateOnce(true)
        }
        else {
            window.alert("That gene is not present in the dataset.")
        }

    }
    else {
        window.alert('Please enter a gene.')
    }
}

function searchForGene(query) {
    return genomeModel.searchForGene(query)
}

function alignSearch(geneLocation) {

    genomeModel.alignSearch(geneLocation)

}
function removeDisplay() {
    if (selectedInfo != undefined) {
        selectedInfo.remove()
    }
}

function removeExtraViews() {

    while (viewList.length > totalViews) {
        let trash = viewList.pop()
        trash.removeSelector()
    }
}

function resetViews() {
    while (viewList.length > totalViews) {
        let trash = viewList.pop()
        trash.removeSelector()
    }
}


pullInfo(chosenGenomeFile).then(dataset => {
    genomeModel = new Model(dataset)
})
pullGeneInfo(chosenCollinearityFile, ['at']).then(pairs => {
    genomeModel.setOrthologs(pairs)
})


controller = new Controller()
controller.setModel(genomeModel)

function setup() {
    w = $(document).width() - 30;
    h = $(document).height();

    createCanvas(w, h);
    background('#141414')

    let title = createDiv("Gene Density Map")
    title.style('font-size', '24px')
    title.position(15, 10)
    title.style('color', 'white')
    title.class("user-select-none")
    density_slider = createSlider(1, 50, 1, 1)
    density_slider.position(w * .05, 40)
    density_slider.style('width', (w * .9) + 'px')

    let search = createInput()
    search.id('search')
    search.class('form-control')
    search.position(w * .05, 60)
    search.size(200)

    let searchButton = createButton('Search')
    searchButton.position((w * .05) + 200, 60)
    searchButton.size = constantHeight
    searchButton.class('btn btn-primary')
    searchButton.mousePressed(searchButtonClicked)

    selectGenome = createSelect();
    selectGenome.position((w * .05) + 280, 60)
    selectGenome.option('Arabidopsis')
    selectGenome.option("Brassica Napus")
    selectGenome.option("Canola Comparison")
    selectGenome.class("user-select-none")
    selectGenome.changed(changeGenome)

    subtitle = createDiv("Chosen Chromosome: ")
    subtitle.style('font-size', '16px')
    subtitle.position(15, 120)
    subtitle.style('color', 'white')
    subtitle.id('subtitle')
    subtitle.class("user-select-none")

    checkbox = createCheckbox('Highlight Orthologs', false);
    checkbox.style('color', 'white')
    checkbox.class('user-select-none')
    checkbox.changed(changedHighlight)
    checkbox.position((w * 0.13) + 390, 60)

}

function draw() {

    fill(255, 0, 0)
    bars = w / density_slider.value()

    let overViewCheck = false
    if (overViewList != undefined) {
        let x = overViewList.length
        for (i = 0; i < x; i++) {
            if (viewList[i].withinBounds()) {
                viewList[i].showChromosome()
                controller.showingInfo = true
                overViewCheck = true
            }
        }
    }
    if (!overViewCheck && controller.showingInfo) {
        removeDisplay()
        controller.showingInfo = false
    }

    if (genomeModel != undefined) {
        genomeModel.getDisplayedGenes().forEach((d) => d.hovering())

        if (controller.rebuild()) {
            background('#141414')

            while (viewList.length > 0) {
                trash = viewList.pop()
                trash.removeSelector()
                trash.removeHighlightBox()
            }
            strokeWeight(0)
            var boxList = []
            var max = 0


            geneDensityScale = genomeModel.overviewScale.range([0, bars])

            overViewList = []
            let temporaryList = []
            let tempCount = 0
            while (tempCount < genomeModel.getNumberOfChromosomes()) {
                if (temporaryList.length == 20) {
                    overViewList.push(temporaryList)
                    temporaryList = []
                }
                else {
                    temporaryList.push(genomeModel.getAlternateChromosomeData(tempCount))
                    tempCount++
                }

            }
            if (temporaryList.length > 0) {
                overViewList.push(temporaryList)
                temporaryList = []
            }

            let number = 0
            let overViewHeight = constantHeight / overViewList.length
            overViewList.forEach(k => {
                boxList = []
                for (x = 0; x < k.length; x++) {

                    let selectedChromosome = k[x]
                    numberOfBars = geneDensityScale(selectedChromosome.cap)

                    building = densityViewInfo(selectedChromosome.data, selectedChromosome.cap, 0, numberOfBars)
                    let densityData = densityViewInfo(selectedChromosome.data, selectedChromosome.cap, 0, w / 15)

                    if (building.getMax() > max) {
                        max = building.getMax()
                    }
                    boxList.push(...building.getBars())
                    genomeModel.appendStoredDensityData(densityData)
                }

                first = new View(150 + (overViewHeight + 10) * number, boxList, max, 'at', overViewHeight)
                number++
                first.removeScale()
                viewList.push(first)
            })


            let selectedChromosome = genomeModel.getAlternateChromosomeData(0)
            let beginning = densityViewInfo(selectedChromosome.data, selectedChromosome.cap, 0, bars)

            second = new View(300, beginning.getBars(), beginning.getMax(), beginning.getChromosome(), constantHeight)
            second.addSelector(20, constantHeight)

            // need some logic around selector
            let secondSubset = second.getSelectorSubset()
            let chosenIndex = genomeModel.getChromosomeIndex(secondSubset.dataset[0].chromosome)

            let thirdDensity = densityViewInfo(genomeModel.getAlternateChromosomeData(chosenIndex).data, secondSubset.end, secondSubset.start, bars)

            third = new View(450, thirdDensity.getBars(), thirdDensity.getMax(), thirdDensity.getChromosome(), constantHeight)
            third.addSelector(20, 20)

            second.addSubscriber(third)
            let thirdSubset = third.getSelectorSubset()

            let fourthDensity = densityViewInfo(thirdSubset.dataset, thirdSubset.end, thirdSubset.start, bars)
            if (fourthDensity != -1) {
                fourth = new View(600, fourthDensity.getBars(), fourthDensity.getMax(), fourthDensity.getChromosome(), constantHeight)
            }
            else {
                fourth = new View(600, thirdDensity.getBars(), thirdDensity.getMax(), thirdDensity.getChromosome(), constantHeight)

            }
            fourth.noAverage()
            fourth.makeSelectable()
            third.addSubscriber(fourth)

            built = true
            viewList.push(second, third, fourth)
            for (z = 0; z < viewList.length; z++) {
                genomeModel.addToViewList(viewList[z])
                viewList[z].update()
            }

            controller.made(true)
            totalViews = viewList.length
        }

        if (mouseIsPressed && !controller.liveUpdate) {
            viewList.forEach((z) => {
                if (z.checkSelector) {
                    if (z.hit() || z.dragged() || z.resized()) {
                        z.updateSelector(mouseX)
                    }
                }
            })
        }

        else if (controller.changed || controller.getDragging() || controller.getUpdateOnce()) {
            controller.setUpdateOnce(false)
            if (built) {

                // Need logic around a changed selection, otherwise repeatedly adding and drawing new view
                // List of genes is being updated with selecting orthologs
                genomeModel.getDisplayedGenes().forEach(x => {
                    if (x.clicked()) {
                        resetViews()
                        genomeModel.setSelectedGene(x)
                        genomeModel.changeChromosome(x.chromosome)
                        // selected = x

                        let details = searchForGene(x.key)
                        alignSearch(details)

                    }
                })
                var selected = genomeModel.getSelectedGene()
                if (selected != undefined && selected.hasOrthologs()) {

                    removeExtraViews()

                    // Creating mini-views for the orthologous genes
                    selected.getOrthologs().forEach((z, i) => {
                        let goal = z
                        let searchInformation = searchForGene(goal)
                        let contextInformation = searchInformation.chromosomeData
                        let index = genomeModel.getChromosomeIndex(searchInformation.chromosome)
                        let endOfRange = genomeModel.getAlternateChromosomeData(index).cap
                        let comparisonViewScale = d3.scaleLinear().domain([0, w]).range([0, endOfRange])
                        let firstCompression = comparisonViewScale(constantHeight)
                        let startLocation = contextInformation[contextInformation.findIndex(d => {
                            return d.key == goal.toLowerCase()
                        })].start

                        let beginningFilter = +startLocation - firstCompression / 2
                        let endFilter = +startLocation + firstCompression / 2

                        // Logic too simple
                        let firstSubset = contextInformation.filter(x => {
                            return x.start > beginningFilter && x.end < endFilter
                        })

                        let secondCompression = comparisonViewScale.range([0, firstCompression])(20)
                        secbeginningFilter = +startLocation - secondCompression
                        secendFilter = +startLocation + secondCompression
                        let secondSubset = firstSubset.filter(x => {
                            return x.start > secbeginningFilter && x.end < secendFilter
                        })

                        let orthologView = new View(750 + (200 * Math.floor(i / 2)), secondSubset, constantHeight, searchInformation.chromosome, constantHeight)
                        orthologView.noAverage()
                        orthologView.makeSelectable()

                        let savedDensityData = genomeModel.getStoredDensityData(index)

                        let navigationOrthologView = new View((750 + (200 * Math.floor(i / 2)) + 130), savedDensityData.getBars(), savedDensityData.getMax(), savedDensityData.getChromosome(), 25)

                        let locationScale = d3.scaleLinear().domain([0, endOfRange]);
                        if (i % 2 == 1) {
                            orthologView.setAlternateWidth((w / 2) -10 , (w / 2) - 5)
                            navigationOrthologView.setAlternateWidth((w / 2) -10 , (w / 2) - 5)
                            locationScale.range([(w / 2)-5, w])

                        }
                        else {
                            if (i == selected.getOrthologs().length - 1) {
                                locationScale.range([0, w])
                            }
                            else {
                                orthologView.setAlternateWidth((w / 2) - 10, 0)
                                navigationOrthologView.setAlternateWidth((w / 2)-10, 0)
                                locationScale.range([0, (w / 2)-5])
                            }
                        }
                        navigationOrthologView.addSelector(locationScale(startLocation) - 5, 10)
                        navigationOrthologView.extraHighlight()
                        viewList.push(orthologView)
                        viewList.push(navigationOrthologView)
                    })

                    if (clearButton == undefined) {
                        clearButton = createButton("Clear Selection")
                        clearButton.class("btn btn-danger")
                    }
                    clearButton.position(20, 750 + (Math.ceil(selected.getOrthologs().length / 2) * 190))
                    clearButton.mousePressed(() => {
                        genomeModel.setSelectedGene(undefined);
                        genomeModel.clearDisplayedGenes();
                        removeExtraViews();

                    })

                    if (selected == undefined || !selected.hasOrthologs()) {
                        clearButton.remove()
                        clearButton = undefined
                    }
                    while (viewList.length > (4 + selected.getOrthologs().length) * 2) {
                        let trash = viewList.pop()

                    }
                }
                else {
                    if (clearButton != undefined) {
                        clearButton.remove()
                    }

                    clearButton = undefined
                    removeExtraViews()
                }
                background('#141414')
                let altered = false
                // Hacky loop instead of subscribers atm

                if (sliderChange()) {

                    genomeModel.clearDisplayedGenes()
                    let choice = genomeModel.getChromosomeIndex(second.getChromosome())

                    let information = genomeModel.getAlternateChromosomeData(choice)

                    bars = w / density_slider.value()

                    let thisCouldBeBetter = densityViewInfo(information.data, information.cap, information.start, bars)
                    second.updateDataset(thisCouldBeBetter.getBars(), thisCouldBeBetter.getMax(), information.cap)
                    second.updateSubscribers()
                }
                if (genomeModel.getHighlightOrthologs()) {
                    third.noAverage()
                    density_slider.value(1)
                }
                else {
                    third.pleaseAverage()
                }

                for (z = 0; z < viewList.length; z++) {

                    if (viewList[z].checkSelector()) {

                        if (viewList[z].hit() || viewList[z].dragged() || viewList[z].resized()) {
                            genomeModel.clearDisplayedGenes()
                            viewList[z].updateSelector(mouseX)
                            altered = true
                        }
                    }

                    else {

                        if (viewList[z].withinBounds() && viewList[z].getAveraging()) {
                            while (viewList.length > totalViews) {
                                let trash = viewList.pop()
                            }
                            genomeModel.clearDisplayedGenes()
                            selected = undefined
                            let selection = viewList[z].findSelection()
                            genomeModel.changeChromosome(selection)
                            let index = genomeModel.getChromosomeIndex(selection)
                            let newSet = densityViewInfo(genomeModel.getAlternateChromosomeData(index).data, genomeModel.getAlternateChromosomeData(index).cap, 0, bars)
                            let c = 0
                            while (!viewList[z + c].checkSelector()) {
                                c++
                            }
                            viewList[z + c].updateDataset(newSet.getBars(), newSet.getMax(),genomeModel.getAlternateChromosomeData(index).cap)
                            altered = true
                        }
                    }
                    viewList[z].update()
                }
            }

            subtitle.html("Chosen Chromosome: " + genomeModel.getChromosomeName())
        }
    }
}
