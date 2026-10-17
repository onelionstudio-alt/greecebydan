"""Prevent inflated or overstated inventory conclusions in audit reporting."""
import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('inventory_report',Path(__file__).resolve().parents[1]/'scripts/culture-inventory/report.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

def row(code='P1',guide=True,language='en',status='ACTIVE'):
    return {'summary':{'productCode':code,'title':'Test tour','productUrl':'https://www.viator.com/tours/test?pid=keep'},
            'qualifiesGuided':guide,'detail':{'status':status,'conditions':{'guide':'included' if guide else 'not_confirmed','languages':[language] if guide else [],'group':'private','pickup':'meeting_point'}}}

def case(products,scope='delphi_athens'):
    return {'status':200,'data':{'case':'fixed','config':{'scope':scope},'products':products,'searchCount':50,'candidateCount':10}}

class InventoryReportingTests(unittest.TestCase):
    def test_repeated_tags_do_not_multiply_real_products_or_prove_route(self):
        r=module.summarize({'results':[case([row()]),case([row()])]})
        self.assertEqual(r['uniqueConfirmedByScope'],{'delphi_athens':1})
        self.assertEqual(r['englishConfirmedByScope'],{'delphi_athens':1})
        self.assertFalse(r['complete'])
        p=r['products'][0]
        self.assertEqual(p['departure'],'NOT_ESTABLISHED')
        self.assertEqual(p['transport'],'NOT_ESTABLISHED')
        self.assertEqual(p['availability'],'NOT_CHECKED')

    def test_conflicting_language_or_inactive_status_cannot_create_positive_union(self):
        for second in [row(language='de'),row(guide=False),row(status='INACTIVE')]:
            with self.subTest(second=second):
                r=module.summarize({'results':[case([row()]),case([second])]})
                self.assertEqual(r['uniqueConfirmedByScope'],{})
                self.assertEqual(r['products'][0]['languages'],[])

    def test_guide_without_english_is_never_counted_as_english(self):
        r=module.summarize({'results':[case([row(language='de')])]})
        self.assertEqual(r['uniqueConfirmedByScope'],{'delphi_athens':1})
        self.assertEqual(r['englishConfirmedByScope'],{})

if __name__=='__main__':unittest.main()
