Input:Control Measures:  <p><strong>Control Measures</strong></p><ol><li><strong>One</strong></li><li><strong>Two</strong><ol><li><strong>Two.1</strong><ol><li><strong>Two.2&nbsp;</strong></li></ol></li></ol></li></ol><p><strong>Normal ﻿﻿<br></strong></p>
Output:
Control Measures
One
Two
Two.1
Two.2 
Normal ÿÿ
 
    const rawControlMeasures = this.raFormGroup?.controls?.raHazardDetailsForm['controls'].controlMeasures.value;
    hazardDetails['controlMeasures'] = rawControlMeasures?.replace(/&#xFEFF;/g, '').trim();
 
Where controlMeasure is a jb-editor richtext editor which is a wrapper of ejs rich text editor angular
 
When text is retrieved from console.log which is mentioned in Input then it has some hidden characters which can only be viewed in html rendering editors when pasted in them and checked upon inspection on the browser
